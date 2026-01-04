"""
Configuration Manager Module

High-level interface for accessing encrypted configuration values.
Provides caching, type conversion, and fallback to environment variables.
"""

import os
import threading
from typing import Optional, Any
from config_db import get_config_db


class ConfigManager:
    """High-level configuration manager with caching and type conversion."""
    
    def __init__(self):
        """Initialize the configuration manager."""
        self._db = get_config_db()
        self._cache = {}
        self._cache_lock = threading.RLock()
    
    def get(self, key: str, default: Optional[str] = None, use_env_fallback: bool = True) -> Optional[str]:
        """
        Get a configuration value.
        
        Args:
            key: Configuration key
            default: Default value if not found
            use_env_fallback: If True, fall back to os.getenv() if not in database
            
        Returns:
            Configuration value or default
        """
        # Check cache first
        with self._cache_lock:
            if key in self._cache:
                return self._cache[key]
        
        # Try database
        value = self._db.get(key)
        
        # Fall back to environment variable if enabled
        if value is None and use_env_fallback:
            value = os.getenv(key)
        
        # Use default if still None
        if value is None:
            value = default
        
        # Cache the result
        if value is not None:
            with self._cache_lock:
                self._cache[key] = value
        
        return value
    
    def get_int(self, key: str, default: Optional[int] = None, use_env_fallback: bool = True) -> Optional[int]:
        """
        Get a configuration value as an integer.
        
        Args:
            key: Configuration key
            default: Default value if not found or conversion fails
            use_env_fallback: If True, fall back to os.getenv()
            
        Returns:
            Integer value or default
        """
        value = self.get(key, use_env_fallback=use_env_fallback)
        
        if value is None:
            return default
        
        try:
            return int(value)
        except (ValueError, TypeError):
            return default
    
    def get_bool(self, key: str, default: bool = False, use_env_fallback: bool = True) -> bool:
        """
        Get a configuration value as a boolean.
        
        Args:
            key: Configuration key
            default: Default value if not found
            use_env_fallback: If True, fall back to os.getenv()
            
        Returns:
            Boolean value or default
        """
        value = self.get(key, use_env_fallback=use_env_fallback)
        
        if value is None:
            return default
        
        # Convert string to boolean
        return value.lower() in ('true', '1', 'yes', 'on')
    
    def set(self, key: str, value: str) -> None:
        """
        Set a configuration value.
        
        Args:
            key: Configuration key
            value: Configuration value
        """
        self._db.set(key, value)
        
        # Update cache
        with self._cache_lock:
            self._cache[key] = value
    
    def delete(self, key: str) -> bool:
        """
        Delete a configuration value.
        
        Args:
            key: Configuration key
            
        Returns:
            True if deleted, False if key didn't exist
        """
        deleted = self._db.delete(key)
        
        # Remove from cache
        with self._cache_lock:
            self._cache.pop(key, None)
        
        return deleted
    
    def exists(self, key: str) -> bool:
        """
        Check if a configuration key exists.
        
        Args:
            key: Configuration key
            
        Returns:
            True if key exists in database
        """
        return self._db.exists(key)
    
    def list_keys(self) -> list[str]:
        """
        List all configuration keys in the database.
        
        Returns:
            List of configuration keys
        """
        return self._db.list_keys()
    
    def clear_cache(self) -> None:
        """Clear the configuration cache."""
        with self._cache_lock:
            self._cache.clear()
    
    def reload(self, key: str) -> Optional[str]:
        """
        Reload a configuration value from the database, bypassing cache.
        
        Args:
            key: Configuration key
            
        Returns:
            Fresh configuration value
        """
        # Remove from cache
        with self._cache_lock:
            self._cache.pop(key, None)
        
        # Fetch fresh value
        return self.get(key, use_env_fallback=False)


# Singleton instance
_config_manager: Optional[ConfigManager] = None
_manager_lock = threading.Lock()


def get_config_manager() -> ConfigManager:
    """Get the singleton ConfigManager instance."""
    global _config_manager
    
    if _config_manager is None:
        with _manager_lock:
            if _config_manager is None:
                _config_manager = ConfigManager()
    
    return _config_manager
