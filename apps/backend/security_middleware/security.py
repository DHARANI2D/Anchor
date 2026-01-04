"""
Security middleware for Anchor backend.
Provides protection against common web vulnerabilities.
"""
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Callable
import re
import time
from collections import defaultdict
import ipaddress

# Rate limiting storage (in production, use Redis)
rate_limit_storage = defaultdict(list)
blocked_ips = set()

# Suspicious patterns for detection
SUSPICIOUS_PATTERNS = [
    r"(\bunion\b.*\bselect\b)",  # SQL injection
    r"(\bor\b.*=.*)",  # SQL injection
    r"(--|;|\/\*|\*\/)",  # SQL comments
    r"(<script|javascript:|onerror=|onload=)",  # XSS
    r"(\.\./|\.\.\\)",  # Path traversal
    r"(exec\(|eval\(|system\()",  # Code injection
]

class SecurityMiddleware(BaseHTTPMiddleware):
    """
    Comprehensive security middleware for protecting against common attacks.
    """
    
    def __init__(self, app, rate_limit: int = 100, time_window: int = 60):
        super().__init__(app)
        self.rate_limit = rate_limit  # requests per time window
        self.time_window = time_window  # seconds
        
    async def dispatch(self, request: Request, call_next: Callable):
        # Get client IP
        client_ip = self.get_client_ip(request)
        
        # Check if IP is blocked
        if client_ip in blocked_ips:
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"detail": "Access denied"}
            )
        
        # Rate limiting
        if not self.check_rate_limit(client_ip):
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Too many requests. Please try again later."}
            )
        
        # Validate request
        if not self.validate_request(request):
            # Log suspicious activity
            print(f"[SECURITY] Suspicious request from {client_ip}: {request.url.path}")
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"detail": "Invalid request"}
            )
        
        # Process request
        response = await call_next(request)
        
        # Add security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
        
        return response
    
    def get_client_ip(self, request: Request) -> str:
        """Extract client IP from request, considering proxies."""
        # Check X-Forwarded-For header (for proxies)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            # Take the first IP (client IP)
            return forwarded.split(",")[0].strip()
        
        # Check X-Real-IP header
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # Fallback to direct connection IP
        if request.client:
            return request.client.host
        
        return "unknown"
    
    def check_rate_limit(self, ip: str) -> bool:
        """Check if IP has exceeded rate limit."""
        now = time.time()
        
        # Clean old entries
        rate_limit_storage[ip] = [
            timestamp for timestamp in rate_limit_storage[ip]
            if now - timestamp < self.time_window
        ]
        
        # Check limit
        if len(rate_limit_storage[ip]) >= self.rate_limit:
            # Temporarily block IP if severely over limit
            if len(rate_limit_storage[ip]) > self.rate_limit * 2:
                blocked_ips.add(ip)
                print(f"[SECURITY] Blocked IP {ip} for excessive requests")
            return False
        
        # Add current request
        rate_limit_storage[ip].append(now)
        return True
    
    def validate_request(self, request: Request) -> bool:
        """Validate request for suspicious patterns."""
        # Check URL path
        path = str(request.url.path)
        query = str(request.url.query) if request.url.query else ""
        
        # Combine for checking
        check_string = f"{path} {query}".lower()
        
        # Check for suspicious patterns
        for pattern in SUSPICIOUS_PATTERNS:
            if re.search(pattern, check_string, re.IGNORECASE):
                return False
        
        # Path traversal check
        if ".." in path or "\\" in path:
            return False
        
        # Null byte check
        if "\x00" in path or "\x00" in query:
            return False
        
        return True


def sanitize_input(value: str) -> str:
    """
    Sanitize user input to prevent XSS and injection attacks.
    """
    if not isinstance(value, str):
        return value
    
    # Remove null bytes
    value = value.replace("\x00", "")
    
    # Remove dangerous characters
    dangerous_chars = ["<", ">", "\"", "'", "&", ";", "|", "`", "$", "(", ")", "{", "}"]
    for char in dangerous_chars:
        value = value.replace(char, "")
    
    # Limit length
    if len(value) > 1000:
        value = value[:1000]
    
    return value.strip()


def sanitize_path(path: str) -> str:
    """
    Sanitize file paths to prevent path traversal attacks.
    """
    # Remove null bytes
    path = path.replace("\x00", "")
    
    # Remove path traversal attempts
    path = path.replace("..", "")
    path = path.replace("\\", "/")
    
    # Remove leading slashes
    while path.startswith("/"):
        path = path[1:]
    
    # Ensure path doesn't escape
    if path.startswith("/") or ".." in path:
        raise ValueError("Invalid path")
    
    return path


def validate_repository_name(name: str) -> bool:
    """
    Validate repository name to prevent injection attacks.
    Only allow alphanumeric, hyphens, and underscores.
    """
    if not name:
        return False
    
    # Check length
    if len(name) < 1 or len(name) > 100:
        return False
    
    # Check pattern (alphanumeric, hyphens, underscores only)
    if not re.match(r'^[a-zA-Z0-9_-]+$', name):
        return False
    
    return True


def is_safe_ip(ip: str) -> bool:
    """
    Check if IP address is safe (not from blocked ranges).
    """
    try:
        ip_obj = ipaddress.ip_address(ip)
        
        # Block private IPs from public access (optional)
        # if ip_obj.is_private:
        #     return False
        
        # Block loopback
        if ip_obj.is_loopback:
            return False
        
        return True
    except ValueError:
        return False
