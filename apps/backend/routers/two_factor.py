from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
import pyotp
import qrcode
import io
import base64
from dependencies import get_current_user, require_step_up
from svcs import get_user_2fa, update_user_2fa
from models import TOTPVerify
from authorization import require_permission, Permission

router = APIRouter(prefix="/user/2fa", tags=["2fa"])

@router.post("/setup")
async def setup_2fa(user: Dict[str, Any] = Depends(get_current_user)):
    """Generate a TOTP secret and QR code for 2FA setup"""
    require_permission(user, Permission.WRITE_PROFILE)
    
    # Check if already enabled
    current_2fa = get_user_2fa(user["sub"])
    if current_2fa["enabled"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is already enabled"
        )
    
    # Generate new secret if not exists or if we're re-setting up
    secret = pyotp.random_base32()
    
    # Create provisioning URI
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(
        name=user["sub"],
        issuer_name="Anchor"
    )
    
    # Generate QR code
    img = qrcode.make(provisioning_uri)
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    qr_base64 = base64.b64encode(buffered.getvalue()).decode()
    
    # Temporarily store secret (unverified)
    # In a real app, we might store this in a temporary cache or pending state
    # For simplicity, we'll return it to the client to send back in /enable
    return {
        "secret": secret,
        "qr_code": f"data:image/png;base64,{qr_base64}"
    }

@router.post("/enable")
async def enable_2fa(
    verify_data: TOTPVerify,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Verify TOTP code and enable 2FA"""
    require_permission(user, Permission.WRITE_PROFILE)
    
    totp = pyotp.TOTP(verify_data.secret)
    # Allow 1-step window (30s) for clock skew
    if not totp.verify(verify_data.code, valid_window=1):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code"
        )
    
    # Enable 2FA
    update_user_2fa(user["sub"], enabled=True, secret=verify_data.secret)
    
    return {"message": "2FA enabled successfully"}

@router.post("/disable")
async def disable_2fa(
    user: Dict[str, Any] = Depends(require_step_up)
):
    """Disable 2FA (requires step-up authentication)"""
    require_permission(user, Permission.WRITE_PROFILE)
    
    update_user_2fa(user["sub"], enabled=False, secret=None)
    
    return {"message": "2FA disabled successfully"}

@router.get("/status")
async def get_2fa_status(user: Dict[str, Any] = Depends(get_current_user)):
    """Check if 2FA is enabled for the current user"""
    current_2fa = get_user_2fa(user["sub"])
    return {"enabled": current_2fa["enabled"]}
