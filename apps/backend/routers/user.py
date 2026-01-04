from fastapi import APIRouter, Depends, HTTPException
from typing import Any, Dict
from dependencies import get_current_user, require_step_up
from svcs import get_user_profile, update_user_profile, get_user_keys, add_user_key, delete_user_key
from models import SSHKeyAdd, UserProfileUpdate
from authorization import require_permission, Permission

router = APIRouter(prefix="/user", tags=["user"])

@router.get("/profile", response_model=Dict[str, Any])
async def read_profile(user: dict = Depends(get_current_user)):
    """Get the current user's profile."""
    require_permission(user, Permission.READ_PROFILE)
    return get_user_profile(user["sub"])

@router.patch("/profile", response_model=Dict[str, Any])
async def update_profile(data: UserProfileUpdate, user: dict = Depends(get_current_user)):
    """Update the current user's profile."""
    require_permission(user, Permission.WRITE_PROFILE)
    
    # Handle sensitive changes requiring step-up
    sensitive_fields = ["username", "new_password"]
    update_data = data.model_dump(exclude_unset=True)
    
    if any(field in update_data for field in sensitive_fields):
        # Enforce step-up for sensitive changes
        from dependencies import require_step_up
        require_step_up(user)
        
        # Handle Rename
        if "username" in update_data and update_data["username"] != user["sub"]:
            from svcs import rename_user
            new_username = update_data["username"]
            rename_user(user["sub"], new_username)
            # Update user in data for the remaining fields to use new username
            user["sub"] = new_username
            
        # Handle Password Change
        if "new_password" in update_data:
            from dependencies import get_password_hash
            from svcs import update_user_password
            hashed = get_password_hash(update_data["new_password"])
            update_user_password(user["sub"], hashed)
            # Remove from update_data so it's not saved to profile.json via svcs
            del update_data["new_password"]

    return update_user_profile(user["sub"], update_data)

@router.get("/keys", response_model=list)
async def read_keys(user: dict = Depends(get_current_user)):
    """Get user's SSH keys."""
    require_permission(user, Permission.MANAGE_KEYS)
    return get_user_keys(user["sub"])

@router.post("/keys", response_model=list)
async def create_key(key_data: SSHKeyAdd, user: dict = Depends(require_step_up)):
    """Add a new SSH key (requires step-up authentication)."""
    require_permission(user, Permission.MANAGE_KEYS)
    return add_user_key(user["sub"], key_data.model_dump())

@router.delete("/keys/{key_id}", response_model=list)
async def remove_key(key_id: str, user: dict = Depends(require_step_up)):
    """Delete an SSH key (requires step-up authentication)."""
    require_permission(user, Permission.MANAGE_KEYS)
    return delete_user_key(user["sub"], key_id)
