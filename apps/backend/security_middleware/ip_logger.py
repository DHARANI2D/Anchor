"""
IP logging middleware for tracking public repository access.
"""
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Callable
from datetime import datetime
import json
import os

# Log file path
LOG_DIR = os.getenv("SVCS_ROOT", "/tmp/anchor-data")
ACCESS_LOG_FILE = os.path.join(LOG_DIR, "access_logs.jsonl")

class IPLoggerMiddleware(BaseHTTPMiddleware):
    """
    Middleware to log all public repository access with IP addresses.
    """
    
    def __init__(self, app):
        super().__init__(app)
        # Ensure log directory exists
        os.makedirs(LOG_DIR, exist_ok=True)
    
    async def dispatch(self, request: Request, call_next: Callable):
        # Check if this is a public endpoint
        is_public_endpoint = (
            request.url.path.startswith("/public/") or
            request.url.path.startswith("/share/")
        )
        
        # Get client info
        client_ip = self.get_client_ip(request)
        user_agent = request.headers.get("User-Agent", "Unknown")
        
        # Process request
        response = await call_next(request)
        
        # Log public access
        if is_public_endpoint and response.status_code == 200:
            self.log_access(
                ip=client_ip,
                path=request.url.path,
                method=request.method,
                user_agent=user_agent,
                status_code=response.status_code
            )
        
        return response
    
    def get_client_ip(self, request: Request) -> str:
        """Extract client IP from request."""
        # Check X-Forwarded-For header (for proxies)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        # Check X-Real-IP header
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # Fallback to direct connection IP
        if request.client:
            return request.client.host
        
        return "unknown"
    
    def log_access(self, ip: str, path: str, method: str, user_agent: str, status_code: int):
        """
        Log access to file in JSONL format.
        """
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "ip": ip,
            "path": path,
            "method": method,
            "user_agent": user_agent,
            "status_code": status_code,
            "access_type": "public"
        }
        
        try:
            with open(ACCESS_LOG_FILE, "a") as f:
                f.write(json.dumps(log_entry) + "\n")
        except Exception as e:
            print(f"[ERROR] Failed to write access log: {e}")
    
    @staticmethod
    def get_recent_logs(limit: int = 100):
        """
        Retrieve recent access logs.
        """
        if not os.path.exists(ACCESS_LOG_FILE):
            return []
        
        logs = []
        try:
            with open(ACCESS_LOG_FILE, "r") as f:
                lines = f.readlines()
                # Get last N lines
                for line in lines[-limit:]:
                    try:
                        logs.append(json.loads(line))
                    except json.JSONDecodeError:
                        continue
        except Exception as e:
            print(f"[ERROR] Failed to read access logs: {e}")
        
        return logs
    
    @staticmethod
    def get_logs_for_ip(ip: str, limit: int = 50):
        """
        Get access logs for a specific IP.
        """
        all_logs = IPLoggerMiddleware.get_recent_logs(limit=1000)
        return [log for log in all_logs if log.get("ip") == ip][:limit]
    
    @staticmethod
    def detect_suspicious_activity(ip: str, time_window_minutes: int = 5) -> bool:
        """
        Detect suspicious activity from an IP.
        """
        from datetime import datetime, timedelta
        
        logs = IPLoggerMiddleware.get_logs_for_ip(ip, limit=200)
        
        # Check for rapid requests
        now = datetime.utcnow()
        cutoff = now - timedelta(minutes=time_window_minutes)
        
        recent_requests = [
            log for log in logs
            if datetime.fromisoformat(log["timestamp"]) > cutoff
        ]
        
        # Flag if more than 100 requests in time window
        if len(recent_requests) > 100:
            return True
        
        # Check for scanning behavior (accessing many different paths)
        unique_paths = set(log["path"] for log in recent_requests)
        if len(unique_paths) > 50:
            return True
        
        return False
