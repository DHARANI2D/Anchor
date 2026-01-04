"""
Token Manager for Rotating Refresh Tokens
Implements secure token rotation to prevent replay attacks
"""
import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict
import json
import os

class RefreshTokenManager:
    """
    Manages refresh tokens with rotation and invalidation.
    Tokens are stored in-memory (can be extended to Redis/DB)
    """
    
    def __init__(self, storage_path: str = "/tmp/refresh_tokens.json"):
        self.storage_path = storage_path
        self.tokens: Dict[str, dict] = {}
        self._load_tokens()
    
    def _load_tokens(self):
        """Load tokens from persistent storage"""
        if os.path.exists(self.storage_path):
            try:
                with open(self.storage_path, 'r') as f:
                    self.tokens = json.load(f)
                # Clean expired tokens on load
                self._cleanup_expired()
            except Exception:
                self.tokens = {}
    
    def _save_tokens(self):
        """Save tokens to persistent storage"""
        try:
            os.makedirs(os.path.dirname(self.storage_path), exist_ok=True)
            with open(self.storage_path, 'w') as f:
                json.dump(self.tokens, f)
        except Exception as e:
            print(f"Warning: Failed to save tokens: {e}")
    
    def _cleanup_expired(self):
        """Remove expired tokens"""
        now = datetime.utcnow().isoformat()
        expired_keys = [
            token_hash for token_hash, data in self.tokens.items()
            if data['expires_at'] < now
        ]
        for key in expired_keys:
            del self.tokens[key]
        if expired_keys:
            self._save_tokens()
    
    def generate_refresh_token(
        self, 
        username: str, 
        fingerprint: Optional[str] = None,
        expires_days: int = 7
    ) -> str:
        """
        Generate a new refresh token
        
        Args:
            username: User identifier
            fingerprint: Device fingerprint (optional)
            expires_days: Token validity in days
            
        Returns:
            Refresh token string
        """
        # Generate cryptographically secure random token
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        
        # Calculate expiry
        expires_at = datetime.utcnow() + timedelta(days=expires_days)
        
        # Store token metadata
        self.tokens[token_hash] = {
            'username': username,
            'fingerprint': fingerprint,
            'created_at': datetime.utcnow().isoformat(),
            'expires_at': expires_at.isoformat(),
            'used': False,
            'rotated_to': None
        }
        
        self._save_tokens()
        return token
    
    def validate_and_rotate(
        self, 
        token: str, 
        fingerprint: Optional[str] = None
    ) -> Optional[Dict[str, str]]:
        """
        Validate refresh token and rotate it
        
        Args:
            token: Refresh token to validate
            fingerprint: Current device fingerprint
            
        Returns:
            Dict with username and new_token, or None if invalid
        """
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        
        # Check if token exists
        if token_hash not in self.tokens:
            return None
        
        token_data = self.tokens[token_hash]
        
        # Check if already used (rotation already happened)
        if token_data['used']:
            # Potential token replay attack - invalidate entire chain
            self._invalidate_token_family(token_hash)
            return None
        
        # Check expiry
        if datetime.fromisoformat(token_data['expires_at']) < datetime.utcnow():
            del self.tokens[token_hash]
            self._save_tokens()
            return None
        
        # Check fingerprint if provided
        if fingerprint and token_data['fingerprint']:
            if token_data['fingerprint'] != fingerprint:
                # Fingerprint mismatch - potential theft
                self._invalidate_token_family(token_hash)
                return None
        
        # Mark old token as used
        token_data['used'] = True
        
        # Generate new refresh token
        new_token = self.generate_refresh_token(
            username=token_data['username'],
            fingerprint=fingerprint or token_data['fingerprint']
        )
        
        # Link old token to new one (for family tracking)
        new_token_hash = hashlib.sha256(new_token.encode()).hexdigest()
        token_data['rotated_to'] = new_token_hash
        
        self._save_tokens()
        
        return {
            'username': token_data['username'],
            'new_token': new_token
        }
    
    def _invalidate_token_family(self, token_hash: str):
        """
        Invalidate entire token family (for replay attack detection)
        Follows the rotation chain and invalidates all tokens
        """
        # Invalidate the current token
        if token_hash in self.tokens:
            del self.tokens[token_hash]
        
        # Find and invalidate all tokens in the family
        # (tokens that were rotated from this one)
        for th, data in list(self.tokens.items()):
            if data.get('rotated_to') == token_hash:
                self._invalidate_token_family(th)
        
        self._save_tokens()
    
    def revoke_token(self, token: str) -> bool:
        """
        Manually revoke a refresh token
        
        Args:
            token: Token to revoke
            
        Returns:
            True if revoked, False if not found
        """
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        if token_hash in self.tokens:
            self._invalidate_token_family(token_hash)
            return True
        return False
    
    def revoke_all_user_tokens(self, username: str) -> int:
        """
        Revoke all refresh tokens for a user
        
        Args:
            username: User identifier
            
        Returns:
            Number of tokens revoked
        """
        count = 0
        for token_hash, data in list(self.tokens.items()):
            if data['username'] == username:
                del self.tokens[token_hash]
                count += 1
        
        if count > 0:
            self._save_tokens()
        
        return count
    
    def get_user_token_count(self, username: str) -> int:
        """Get number of active tokens for a user"""
        return sum(
            1 for data in self.tokens.values()
            if data['username'] == username and not data['used']
        )


# Global instance
_token_manager = None

def get_token_manager() -> RefreshTokenManager:
    """Get or create global token manager instance"""
    global _token_manager
    if _token_manager is None:
        from config_manager import get_config_manager
        config = get_config_manager()
        
        storage_path = config.get("REFRESH_TOKEN_STORAGE")
        if not storage_path:
            svcs_root = config.get("SVCS_ROOT", "/svcs-data")
            storage_path = os.path.join(svcs_root, "refresh_tokens.json")
        _token_manager = RefreshTokenManager(storage_path)
    return _token_manager
