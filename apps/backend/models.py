from pydantic import BaseModel, Field, ConfigDict, field_validator
import re

class RepoCreate(BaseModel):
    """Repository creation model with strict validation"""
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    
    name: str = Field(
        ..., 
        min_length=3, 
        max_length=64,
        pattern=r"^[a-zA-Z0-9_-]+$",
        description="Repository name (alphanumeric, hyphens, underscores only)"
    )
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        # Additional validation: no consecutive special chars
        if '--' in v or '__' in v or '-_' in v or '_-' in v:
            raise ValueError('Repository name cannot contain consecutive special characters')
        # No leading/trailing special chars
        if v[0] in '-_' or v[-1] in '-_':
            raise ValueError('Repository name cannot start or end with special characters')
        # Reserved names
        reserved = ['admin', 'api', 'auth', 'system', 'root', 'test']
        if v.lower() in reserved:
            raise ValueError(f'Repository name "{v}" is reserved')
        return v


class SnapshotCreate(BaseModel):
    """Snapshot creation model with strict validation"""
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    
    message: str = Field(
        ..., 
        min_length=1, 
        max_length=500,  # Increased from 255 for better commit messages
        description="Snapshot commit message"
    )
    
    @field_validator('message')
    @classmethod
    def validate_message(cls, v: str) -> str:
        # No control characters
        if any(ord(c) < 32 and c not in '\n\r\t' for c in v):
            raise ValueError('Message contains invalid control characters')
        # Sanitize excessive whitespace
        v = re.sub(r'\s+', ' ', v).strip()
        if not v:
            raise ValueError('Message cannot be empty or whitespace only')
        return v


class UserProfileUpdate(BaseModel):
    """User profile update model with strict validation"""
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    
    username: str | None = Field(
        None,
        min_length=3,
        max_length=64,
        pattern=r"^[a-zA-Z0-9_-]+$",
        description="New username"
    )
    new_password: str | None = Field(
        None,
        min_length=8,
        max_length=128,
        description="New password (requires step-up)"
    )
    bio: str | None = Field(
        None,
        max_length=500,
        description="User biography"
    )
    location: str | None = Field(
        None,
        max_length=100,
        pattern=r"^[a-zA-Z0-9\s,.-]+$",
        description="User location"
    )
    website: str | None = Field(
        None,
        max_length=200,
        pattern=r"^https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(/.*)?$",
        description="User website URL (must be http/https)"
    )
    
    @field_validator('bio')
    @classmethod
    def validate_bio(cls, v: str | None) -> str | None:
        if v is None:
            return v
        # No excessive newlines
        if '\n\n\n' in v:
            raise ValueError('Bio contains too many consecutive newlines')
        # No control characters except newlines
        if any(ord(c) < 32 and c != '\n' for c in v):
            raise ValueError('Bio contains invalid control characters')
        return v


class SSHKeyAdd(BaseModel):
    """SSH key addition model with strict validation"""
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    
    title: str = Field(
        ...,
        min_length=1,
        max_length=100,
        pattern=r"^[a-zA-Z0-9\s_-]+$",
        description="SSH key title/name"
    )
    key: str = Field(
        ...,
        min_length=100,  # SSH keys are typically 200+ chars
        max_length=10000,
        description="SSH public key"
    )
    
    @field_validator('key')
    @classmethod
    def validate_ssh_key(cls, v: str) -> str:
        # Basic SSH key format validation
        if not (v.startswith('ssh-rsa ') or v.startswith('ssh-ed25519 ') or 
                v.startswith('ecdsa-sha2-') or v.startswith('ssh-dss ')):
            raise ValueError('Invalid SSH key format. Must start with ssh-rsa, ssh-ed25519, ecdsa-sha2-, or ssh-dss')
        
        # Check for proper structure (type + key + optional comment)
        parts = v.split()
        if len(parts) < 2:
            raise ValueError('SSH key must contain at least key type and key data')
        
        # Validate base64 encoding of key data
        import base64
        try:
            base64.b64decode(parts[1])
        except Exception:
            raise ValueError('SSH key data is not valid base64')
        
        return v


class StepUpRequest(BaseModel):
    """Step-up authentication request"""
    model_config = ConfigDict(extra="forbid")
    
    password: str = Field(..., min_length=1, max_length=128)
    code: str | None = Field(
        None,
        min_length=6,
        max_length=6,
        pattern=r"^\d{6}$",
        description="6-digit TOTP code (required if MFA enabled)"
    )

class TOTPVerify(BaseModel):
    """TOTP verification model"""
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    
    code: str = Field(
        ...,
        min_length=6,
        max_length=6,
        pattern=r"^\d{6}$",
        description="6-digit TOTP code"
    )
    secret: str = Field(
        ...,
        description="TOTP secret key"
    )
