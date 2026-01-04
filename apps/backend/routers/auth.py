from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, timedelta
from dependencies import (
    create_access_token, 
    create_refresh_token,
    get_current_user, 
    get_admin_username, 
    get_admin_password_hash, 
    verify_password,
    get_fingerprint,
    verify_token,
    REFRESH_TOKEN_EXPIRE_DAYS
)
import secrets
import base64
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import serialization
from svcs import get_user_keys
from token_manager import get_token_manager

router = APIRouter(prefix="/auth", tags=["auth"])
CHALLENGES = {} # In-memory challenge store (use Redis in production)



class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    username: str = Field(..., min_length=1, max_length=64)
    password: str = Field(..., min_length=1, max_length=128)

class SSHLoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    username: str = Field(..., min_length=1, max_length=64)
    signature: str = Field(...)
    key_id: str = Field(..., min_length=8, max_length=64)

def _set_refresh_cookie(response: Response, token: str):
    response.set_cookie(
        key="refresh_token",
        value=token,
        httponly=True,
        secure=False, # Set to True in production with HTTPS
        samesite="strict",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )

@router.post("/login")
async def login(req: LoginRequest, request: Request, response: Response):
    is_admin = req.username == get_admin_username() and verify_password(req.password, get_admin_password_hash())
    # Temporary guest login for testing view-only mode
    is_guest = req.username == "guest" and req.password == "guest"
    
    if not (is_admin or is_guest):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
    
    # Check if 2FA is enabled
    from svcs import get_user_2fa
    two_fa = get_user_2fa(req.username)
    
    if two_fa["enabled"]:
        # Return partial success, requiring 2FA
        # We don't issue tokens yet, but we might issue a temporary "mfa_token"
        # For simplicity, we'll just return a status and the username
        return {
            "status": "2fa_required",
            "username": req.username,
            "message": "Two-factor authentication required"
        }
    
    fingerprint = get_fingerprint(request)
    access_token = create_access_token({"sub": req.username}, fingerprint)
    
    # Generate refresh token using new token manager
    token_manager = get_token_manager()
    refresh_token = token_manager.generate_refresh_token(req.username, fingerprint)
    
    _set_refresh_cookie(response, refresh_token)
    return {"access_token": access_token, "token_type": "bearer"}

class Login2FARequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    username: str = Field(..., min_length=1, max_length=64)
    code: str = Field(..., min_length=6, max_length=6)

@router.post("/login/2fa")
async def login_2fa(req: Login2FARequest, request: Request, response: Response):
    """Verify 2FA code and complete login"""
    if req.username != get_admin_username():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user")
    
    from svcs import get_user_2fa
    import pyotp
    two_fa = get_user_2fa(req.username)
    
    if not two_fa["enabled"] or not two_fa["secret"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA not enabled")
    
    totp = pyotp.TOTP(two_fa["secret"])
    if not totp.verify(req.code):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid 2FA code")
    
    fingerprint = get_fingerprint(request)
    access_token = create_access_token({"sub": req.username}, fingerprint)
    
    # Generate refresh token using new token manager
    token_manager = get_token_manager()
    refresh_token = token_manager.generate_refresh_token(req.username, fingerprint)
    
    _set_refresh_cookie(response, refresh_token)
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/refresh")
async def refresh(request: Request, response: Response):
    """Refresh access token using rotating refresh token"""
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")
    
    try:
        fingerprint = get_fingerprint(request)
        token_manager = get_token_manager()
        
        # Validate and rotate refresh token
        result = token_manager.validate_and_rotate(refresh_token, fingerprint)
        
        if not result:
            raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
        
        username = result['username']
        new_refresh_token = result['new_token']
        
        # Generate new access token
        access_token = create_access_token({"sub": username}, fingerprint)
        
        # Set new refresh token in cookie
        _set_refresh_cookie(response, new_refresh_token)
        
        return {"access_token": access_token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Refresh failed: {e}")
        raise HTTPException(status_code=401, detail="Refresh failed")

@router.get("/ssh-challenge")
async def ssh_challenge(username: str):
    if username != get_admin_username():
        raise HTTPException(status_code=404, detail="User not found")
    challenge = secrets.token_urlsafe(32)
    CHALLENGES[username] = challenge
    return {"challenge": challenge}



@router.post("/ssh-login")
async def ssh_login(req: SSHLoginRequest, request: Request, response: Response):
    challenge = CHALLENGES.get(req.username)
    if not challenge:
        raise HTTPException(status_code=400, detail="No challenge found")
    
    keys = get_user_keys(req.username)
    key_data = next((k for k in keys if k["id"] == req.key_id), None)
    if not key_data:
        raise HTTPException(status_code=404, detail="Key not found")
    
    try:
        public_key = serialization.load_ssh_public_key(key_data["key"].encode())
        signature = base64.b64decode(req.signature)
        public_key.verify(signature, challenge.encode(), padding.PKCS1v15(), hashes.SHA256())
        
        del CHALLENGES[req.username]
        
        fingerprint = get_fingerprint(request)
        access_token = create_access_token({"sub": req.username}, fingerprint)
        
        # Generate refresh token using new token manager
        token_manager = get_token_manager()
        refresh_token = token_manager.generate_refresh_token(req.username, fingerprint)
        
        _set_refresh_cookie(response, refresh_token)
        return {"access_token": access_token, "token_type": "bearer"}
    except Exception as e:
        print(f"SSH verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid signature")

class StepUpRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    password: str = Field(..., min_length=1, max_length=128)

@router.post("/step-up")
async def step_up(req: StepUpRequest, request: Request, current_user: dict = Depends(get_current_user)):
    username = current_user.get("sub")
    if username != get_admin_username() or not verify_password(req.password, get_admin_password_hash()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid password")
    
    # Check for MFA
    from svcs import get_user_2fa
    two_fa = get_user_2fa(username)
    if two_fa["enabled"]:
        if not req.code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="2FA code required",
                headers={"X-MFA-Required": "true"}
            )
        
        import pyotp
        totp = pyotp.TOTP(two_fa["secret"])
        if not totp.verify(req.code):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid 2FA code")

    fingerprint = get_fingerprint(request)
    # Issue a new access token with step_up=True
    access_token = create_access_token({"sub": username}, fingerprint, step_up=True)
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/logout")
async def logout(request: Request, response: Response, current_user: dict = Depends(get_current_user)):
    """Logout and revoke refresh token"""
    username = current_user.get("sub")
    refresh_token = request.cookies.get("refresh_token")
    
    if refresh_token:
        token_manager = get_token_manager()
        token_manager.revoke_token(refresh_token)
    
    response.delete_cookie("refresh_token")
    return {"msg": f"User {username} logged out"}
