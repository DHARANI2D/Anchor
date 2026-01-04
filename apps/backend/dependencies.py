import os
import hashlib
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional
import jwt
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer

import bcrypt

# Import new security modules
from token_manager import get_token_manager
from fingerprint import get_device_fingerprint

# Import configuration manager
from config_manager import get_config_manager

# Initialize config manager
config = get_config_manager()

# Simple secret for demo – replace with env var in production
SECRET_KEY = config.get("ANCHOR_SECRET", "supersecretkey", use_env_fallback=False)
if len(SECRET_KEY) < 16 and config.get("NODE_ENV") == "production":
    raise ValueError("ANCHOR_SECRET must be at least 16 characters in production")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 5  # Reduced from 30min to 5min for security
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Admin credentials - reload from config database dynamically
def get_admin_username():
    """Get current admin username from config database."""
    return config.get("ADMIN_USERNAME", "admin", use_env_fallback=False)

# Maintain backward compatibility
ADMIN_USERNAME = get_admin_username()

def get_admin_password_hash():
    """Get admin password hash, checking config database first."""
    # Priority: config database (plain) → persisted hash → env var (plain)
    
    # Check config database for plain password
    plain_password = config.get("ADMIN_PASSWORD", use_env_fallback=False)
    if plain_password:
        # Hash it on the fly (config DB stores plain text, encrypted by Fernet)
        return get_password_hash(plain_password)
    
    # Fallback to persisted hash
    from svcs import get_persisted_password_hash
    persisted = get_persisted_password_hash(get_admin_username())
    if persisted:
        return persisted
        
    # Fallback to env var - DISABLED
    # plain_env = config.get("ADMIN_PASSWORD")
    # if plain_env:
    #     return get_password_hash(plain_env)
        
    return None

# Remove static ADMIN_PASSWORD_HASH to prevent stale state

def verify_password(plain_password, hashed_password):
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception as e:
        print(f"DEBUG: Password verification error: {e}")
        return False

def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

oauth_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_fingerprint(request: Request) -> str:
    """Generate a device fingerprint based on User-Agent and IP."""
    # Use new fingerprint module for enhanced security
    return get_device_fingerprint(request)

def create_access_token(data: dict, fingerprint: str, expires_delta: Optional[timedelta] = None, step_up: bool = False) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "fpt": fingerprint})
    if step_up:
        to_encode.update({"step_up": True, "step_up_at": datetime.utcnow().timestamp()})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict, fingerprint: str) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "fpt": fingerprint, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str, request: Request = None) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Verify fingerprint if request is provided
        if request and "fpt" in payload:
            current_fpt = get_fingerprint(request)
            if payload["fpt"] != current_fpt:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Device fingerprint mismatch")
                
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

def get_current_user(request: Request, token: str = Depends(oauth_scheme)) -> dict:
    return verify_token(token, request)

def require_step_up(user: dict = Depends(get_current_user)) -> dict:
    """Dependency to require a fresh step-up authentication."""
    if not user.get("step_up"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Step-up authentication required"
        )
    
    # Step-up is valid for 5 minutes
    step_up_at = user.get("step_up_at")
    if not step_up_at or (datetime.utcnow().timestamp() - step_up_at) > 300:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Step-up authentication expired"
        )
    return user

def check_repo_access(name: str, user: dict = Depends(get_current_user)) -> str:
    """Verify that the repository exists and the user has access."""
    import os
    repo_root = config.get("SVCS_ROOT", "/svcs-data")
    repo_path = os.path.join(repo_root, name)
    
    if not os.path.exists(repo_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found")
    
    # In this single-user admin mode, any authenticated user (admin) has access to all repos.
    # This structure is ready for multi-tenant role checks.
    return name
