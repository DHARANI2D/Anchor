import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from config_manager import get_config_manager

config = get_config_manager()

def add_cors(app: FastAPI):
    allowed_origins = config.get("ALLOWED_ORIGINS", "").split(",")
    # Default local origins if none provided
    if not any(allowed_origins):
        allowed_origins = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:8000",
            "http://127.0.0.1:8000",
        ]
    
    # Always include the local IP for convenience in this environment
    if "http://localhost:8000" not in allowed_origins:
        allowed_origins.append("http://localhost:8000")
    if "http://localhost:3000" not in allowed_origins:
        allowed_origins.append("http://localhost:3000")
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        # Allow localhost and local network IPs
        # Allow localhost, local network IPs, and common tunnel domains
        allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}):?.*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        # CSP is handled by Next.js _document.tsx via meta tag for nonce support
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

def add_security_headers(app: FastAPI):
    app.add_middleware(SecurityHeadersMiddleware)
