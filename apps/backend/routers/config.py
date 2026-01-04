"""
Configuration Management Router

Secure endpoints for updating critical configuration values (username, password)
with mandatory step-up authentication and 2FA verification.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, validator
from config_manager import get_config_manager
from dependencies import require_step_up, get_password_hash
from svcs import get_user_2fa
import re

router = APIRouter(prefix="/config", tags=["config"])


class UpdateUsernameRequest(BaseModel):
    new_username: str = Field(..., min_length=3, max_length=32)
    totp_code: str = Field(None, min_length=6, max_length=6)
    
    @validator('new_username')
    def validate_username(cls, v):
        """Validate username format: alphanumeric, underscore, hyphen only."""
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError('Username must contain only alphanumeric characters, underscores, and hyphens')
        return v


class UpdatePasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=8, max_length=128)
    totp_code: str = Field(None, min_length=6, max_length=6)
    
    @validator('new_password')
    def validate_password(cls, v):
        """Validate password strength."""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v


@router.patch("/username", response_model=dict)
async def update_username(
    req: UpdateUsernameRequest,
    user: dict = Depends(require_step_up)
):
    """
    Update admin username in encrypted config database.
    Requires step-up authentication and 2FA verification if enabled.
    """
    current_username = user.get("sub")
    
    # Check if 2FA is enabled
    two_fa = get_user_2fa(current_username)
    if two_fa["enabled"]:
        if not req.totp_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="2FA code required",
                headers={"X-MFA-Required": "true"}
            )
        
        # Verify TOTP code
        import pyotp
        totp = pyotp.TOTP(two_fa["secret"])
        if not totp.verify(req.totp_code):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid 2FA code"
            )
    
    # Update username in config database
    config = get_config_manager()
    config.set("ADMIN_USERNAME", req.new_username)
    
    # Clear cache to force reload
    config.clear_cache()
    
    # Log the change
    print(f"[CONFIG] Username updated from '{current_username}' to '{req.new_username}'")
    
    return {
        "message": "Username updated successfully",
        "new_username": req.new_username,
        "note": "Please login with your new username"
    }


@router.patch("/password", response_model=dict)
async def update_password(
    req: UpdatePasswordRequest,
    user: dict = Depends(require_step_up)
):
    """
    Update admin password in encrypted config database.
    Requires step-up authentication and 2FA verification if enabled.
    Invalidates all existing refresh tokens for security.
    """
    current_username = user.get("sub")
    
    # Check if 2FA is enabled
    two_fa = get_user_2fa(current_username)
    if two_fa["enabled"]:
        if not req.totp_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="2FA code required",
                headers={"X-MFA-Required": "true"}
            )
        
        # Verify TOTP code
        import pyotp
        totp = pyotp.TOTP(two_fa["secret"])
        if not totp.verify(req.totp_code):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid 2FA code"
            )
    
    # Update password in config database
    config = get_config_manager()
    config.set("ADMIN_PASSWORD", req.new_password)
    
    # Clear cache to force reload
    config.clear_cache()
    
    # Invalidate all refresh tokens for security
    from token_manager import get_token_manager
    token_manager = get_token_manager()
    revoked_count = token_manager.revoke_all_user_tokens(current_username)
    
    # Log the change
    print(f"[CONFIG] Password updated for user '{current_username}'. Revoked {revoked_count} refresh tokens.")
    
    return {
        "message": "Password updated successfully",
        "tokens_revoked": revoked_count,
        "note": "All sessions have been invalidated. Please login again."
    }


@router.get("/keys", response_model=dict)
async def list_config_keys(user: dict = Depends(require_step_up)):
    """
    List all configuration keys (non-sensitive).
    Requires step-up authentication.
    """
    config = get_config_manager()
    keys = config.list_keys()
    
    # Filter out sensitive values
    safe_keys = [k for k in keys if k not in ["ADMIN_PASSWORD", "ANCHOR_SECRET"]]
    
    return {
        "keys": safe_keys,
        "total": len(keys),
        "note": "Sensitive keys are hidden"
    }
