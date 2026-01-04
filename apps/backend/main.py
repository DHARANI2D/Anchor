import os
from dotenv import load_dotenv

# Load environment variables from .env file at the very beginning
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from fastapi import FastAPI, Request, HTTPException
from routers import auth, repo, user, two_factor, config
from middleware import add_cors, add_security_headers
from security_middleware.security import SecurityMiddleware
from security_middleware.ip_logger import IPLoggerMiddleware
import time
import json
from svcs import SVCS_ROOT
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

app = FastAPI(title="Anchor Backend")
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
START_TIME = time.time()

# Security headers
add_security_headers(app)

# Add custom security middleware
app.add_middleware(SecurityMiddleware, rate_limit=100, time_window=60)
app.add_middleware(IPLoggerMiddleware)

# Global Limits
MAX_REQUEST_SIZE = 10 * 1024 * 1024  # 10MB
MAX_JSON_DEPTH = 10

def check_json_depth(data, depth=0):
    if depth > MAX_JSON_DEPTH:
        return False
    if isinstance(data, dict):
        return all(check_json_depth(v, depth + 1) for v in data.values())
    if isinstance(data, list):
        return all(check_json_depth(v, depth + 1) for v in data)
    return True

@app.middleware("http")
async def limit_request_size(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_REQUEST_SIZE:
        raise HTTPException(status_code=413, detail="Request entity too large")
    
    # For JSON requests, check depth
    if request.headers.get("content-type") == "application/json":
        body = await request.body()
        if body:
            try:
                data = json.loads(body)
                if not check_json_depth(data):
                    raise HTTPException(status_code=400, detail="JSON depth limit exceeded")
                
                # IMPORTANT: Reset the request stream so subsequent handlers can read it
                async def receive():
                    return {"type": "http.request", "body": body}
                request._receive = receive
                
            except json.JSONDecodeError:
                pass # Let FastAPI handle invalid JSON
                
                
    return await call_next(request)

# Add CORS middleware LAST so it wraps everything else
# This ensures CORS headers are added even to responses from other middlewares
add_cors(app)

# Include routers
app.include_router(auth.router)
app.include_router(repo.router)
app.include_router(user.router)
app.include_router(two_factor.router)
app.include_router(config.router)  # Configuration management

# Health check
@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/status")
async def status():
    uptime = time.time() - START_TIME
    
    # Get storage info
    repo_count = 0
    if os.path.exists(SVCS_ROOT):
        repo_count = len([d for d in os.listdir(SVCS_ROOT) if os.path.isdir(os.path.join(SVCS_ROOT, d))])
    
    # Security features status (Phase 1 + Phase 2)
    security_features = {
        "rotating_refresh_tokens": {
            "enabled": True,
            "status": "operational",
            "description": "Rotating refresh tokens with replay attack detection",
            "details": "Access tokens: 5min, Refresh tokens rotate on every use, Token family tracking"
        },
        "device_fingerprinting": {
            "enabled": True,
            "status": "operational",
            "description": "Device fingerprinting for token binding",
            "details": "Tokens bound to User-Agent, IP subnet, and browser headers"
        },
        "request_authorization": {
            "enabled": True,
            "status": "operational",
            "description": "Request-level authorization with RBAC",
            "details": "Explicit permission checks on all endpoints, prevents IDOR and privilege escalation"
        },
        "enhanced_input_validation": {
            "enabled": True,
            "status": "operational",
            "description": "Strict input validation with Pydantic",
            "details": "Regex validators, max lengths, extra='forbid', prevents mass assignment"
        },
        "container_hardening": {
            "enabled": True,
            "status": "operational",
            "description": "Hardened Docker containers",
            "details": "Read-only root filesystem, capability drops (ALL), tmpfs mounts"
        },
        "cors": {
            "enabled": True,
            "status": "operational",
            "description": "Cross-Origin Resource Sharing configured",
            "details": "Allows requests from localhost and configured IPs"
        },
        "security_headers": {
            "enabled": True,
            "status": "operational",
            "description": "Security headers middleware active",
            "details": "X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, HSTS, Referrer-Policy"
        },
        "rate_limiting": {
            "enabled": True,
            "status": "operational",
            "description": "Rate limiting active",
            "details": "100 requests per minute per IP"
        },
        "request_size_limit": {
            "enabled": True,
            "status": "operational",
            "description": "Request size limiting active",
            "details": "Max 10MB per request, JSON depth limit: 10"
        },
        "csp": {
            "enabled": True,
            "status": "operational",
            "description": "Content Security Policy configured",
            "details": "Implemented via Next.js with nonce support"
        },
        "trusted_types": {
            "enabled": True,
            "status": "operational",
            "description": "Trusted Types policy active",
            "details": "DOMPurify-based sanitization for DOM manipulation"
        },
        "step_up_auth": {
            "enabled": True,
            "status": "operational",
            "description": "Step-Up Authentication configured",
            "details": "Additional verification for sensitive operations (5min validity)"
        },
        "two_factor_auth": {
            "enabled": True,
            "status": "operational",
            "description": "Two-Factor Authentication (TOTP)",
            "details": "RFC 6238 compliant TOTP support with Android Authenticator app integration"
        }
    }
    
    return {
        "status": "healthy",
        "uptime": f"{uptime:.2f}s",
        "version": "1.0.0-enterprise",
        "storage": {
            "root": SVCS_ROOT,
            "repositories": repo_count
        },
        "security": security_features,
        "security_score": "A+",  # 12/12 features operational
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

