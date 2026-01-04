"""
Request-Level Authorization Module
Implements explicit permission checks to prevent IDOR and privilege escalation
"""
from typing import Optional, Dict, Any
from fastapi import HTTPException, status
from enum import Enum

class Permission(str, Enum):
    """Defined permissions in the system"""
    # Repository permissions
    READ_REPO = "read:repo"
    WRITE_REPO = "write:repo"
    DELETE_REPO = "delete:repo"
    CREATE_REPO = "create:repo"
    ADMIN_REPO = "admin:repo"
    
    # User permissions
    READ_PROFILE = "read:profile"
    WRITE_PROFILE = "write:profile"
    MANAGE_KEYS = "manage:keys"
    EXPORT_KEYS = "export:keys"
    
    # Admin permissions
    ADMIN_ALL = "admin:*"
    
    # Snapshot permissions
    CREATE_SNAPSHOT = "create:snapshot"
    READ_SNAPSHOT = "read:snapshot"
    RESTORE_SNAPSHOT = "restore:snapshot"


class Role(str, Enum):
    """User roles"""
    ADMIN = "admin"
    USER = "user"
    GUEST = "guest"


# Permission matrix: role -> list of permissions
ROLE_PERMISSIONS: Dict[Role, list[Permission]] = {
    Role.ADMIN: [
        Permission.ADMIN_ALL,
        Permission.READ_REPO,
        Permission.WRITE_REPO,
        Permission.DELETE_REPO,
        Permission.CREATE_REPO,
        Permission.ADMIN_REPO,
        Permission.READ_PROFILE,
        Permission.WRITE_PROFILE,
        Permission.MANAGE_KEYS,
        Permission.EXPORT_KEYS,
        Permission.CREATE_SNAPSHOT,
        Permission.READ_SNAPSHOT,
        Permission.RESTORE_SNAPSHOT,
    ],
    Role.USER: [
        Permission.READ_REPO,
        Permission.WRITE_REPO,
        Permission.CREATE_REPO,
        Permission.READ_PROFILE,
        Permission.WRITE_PROFILE,
        Permission.MANAGE_KEYS,
        Permission.CREATE_SNAPSHOT,
        Permission.READ_SNAPSHOT,
    ],
    Role.GUEST: [
        Permission.READ_REPO,
        Permission.READ_PROFILE,
    ]
}


def get_user_role(username: str) -> Role:
    """
    Get user role (in production, this would query a database)
    
    Args:
        username: Username to check
        
    Returns:
        User's role
    """
    # For now, admin is the only user
    # In multi-tenant mode, this would check database
    from config_manager import get_config_manager
    config = get_config_manager()
    admin_username = config.get("ADMIN_USERNAME", "admin", use_env_fallback=False)
    
    if username == admin_username:
        return Role.ADMIN
    else:
        return Role.GUEST


def has_permission(user: dict, permission: Permission) -> bool:
    """
    Check if user has a specific permission
    
    Args:
        user: User dict from JWT token (contains 'sub' field)
        permission: Permission to check
        
    Returns:
        True if user has permission
    """
    username = user.get("sub")
    if not username:
        return False
    
    role = get_user_role(username)
    permissions = ROLE_PERMISSIONS.get(role, [])
    
    # Check for admin wildcard
    if Permission.ADMIN_ALL in permissions:
        return True
    
    return permission in permissions


def check_resource_ownership(user: dict, resource_type: str, resource_id: str) -> bool:
    """
    Check if user owns a specific resource
    
    Args:
        user: User dict from JWT token
        resource_type: Type of resource (repo, snapshot, etc.)
        resource_id: Resource identifier
        
    Returns:
        True if user owns the resource
    """
    username = user.get("sub")
    if not username:
        return False
    
    # For single-user mode, admin owns everything
    # In multi-tenant mode, this would check database
    role = get_user_role(username)
    if role == Role.ADMIN:
        return True
    
    # In multi-tenant mode, check ownership in database
    # For now, return False for non-admin users
    return False


def can(user: dict, action: Permission, resource: Optional[Dict[str, Any]] = None) -> bool:
    """
    Main authorization function - check if user can perform action on resource
    
    Args:
        user: User dict from JWT token
        action: Permission/action to check
        resource: Optional resource dict with 'type' and 'id' fields
        
    Returns:
        True if user is authorized
    """
    # First check if user has the permission
    if not has_permission(user, action):
        return False
    
    # If no resource specified, permission check is enough
    if not resource:
        return True
    
    # Check resource ownership
    resource_type = resource.get("type")
    resource_id = resource.get("id")
    
    if resource_type and resource_id:
        return check_resource_ownership(user, resource_type, resource_id)
    
    return True


def require_permission(user: dict, permission: Permission, resource: Optional[Dict[str, Any]] = None):
    """
    Require permission or raise 403 Forbidden
    
    Args:
        user: User dict from JWT token
        permission: Required permission
        resource: Optional resource to check ownership
        
    Raises:
        HTTPException: 403 if permission denied
    """
    if not can(user, permission, resource):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied: {permission.value}"
        )


def require_ownership(user: dict, resource_type: str, resource_id: str):
    """
    Require resource ownership or raise 403 Forbidden
    
    Args:
        user: User dict from JWT token
        resource_type: Type of resource
        resource_id: Resource identifier
        
    Raises:
        HTTPException: 403 if not owner
    """
    if not check_resource_ownership(user, resource_type, resource_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You do not have access to this {resource_type}"
        )


# Convenience decorators for common checks
def require_admin(user: dict):
    """Require admin role"""
    if get_user_role(user.get("sub")) != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
