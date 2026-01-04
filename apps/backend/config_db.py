"""
Encrypted Configuration Database Module

Provides SQLite-based storage for encrypted configuration values using Fernet symmetric encryption.
All sensitive configuration data is encrypted at rest.
"""

import os
import sqlite3
import threading
from datetime import datetime
from typing import Optional
from cryptography.fernet import Fernet
from pathlib import Path


class ConfigDB:
    """Thread-safe encrypted configuration database."""
    
    def __init__(self, db_path: str = None, key_path: str = None):
        """
        Initialize the configuration database.
        
        Args:
            db_path: Path to SQLite database file
            key_path: Path to encryption key file
        """
        # Default paths relative to this file
        backend_dir = Path(__file__).parent
        self.db_path = db_path or str(backend_dir / "config.db")
        self.key_path = key_path or str(backend_dir / "config.key")
        
        # Thread safety
        self._lock = threading.RLock()
        
        # Initialize encryption key
        self._cipher = self._load_or_create_key()
        
        # Initialize database
        self._init_db()
    
    def _load_or_create_key(self) -> Fernet:
        """Load existing encryption key or create a new one."""
        if os.path.exists(self.key_path):
            with open(self.key_path, 'rb') as f:
                key = f.read()
        else:
            # Generate new key
            key = Fernet.generate_key()
            
            # Save key with restricted permissions
            with open(self.key_path, 'wb') as f:
                f.write(key)
            
            # Set file permissions to 600 (owner read/write only)
            os.chmod(self.key_path, 0o600)
            
            print(f"[ConfigDB] Created new encryption key at {self.key_path}")
        
        return Fernet(key)
    
    def _init_db(self):
        """Initialize the database schema."""
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Create config table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS config (
                    key TEXT PRIMARY KEY,
                    encrypted_value BLOB NOT NULL,
                    updated_at TEXT NOT NULL
                )
            """)
            
            # Create index for faster lookups
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_updated_at 
                ON config(updated_at)
            """)
            
            conn.commit()
            conn.close()
    
    def _encrypt(self, value: str) -> bytes:
        """Encrypt a string value."""
        return self._cipher.encrypt(value.encode('utf-8'))
    
    def _decrypt(self, encrypted_value: bytes) -> str:
        """Decrypt an encrypted value."""
        return self._cipher.decrypt(encrypted_value).decode('utf-8')
    
    def set(self, key: str, value: str) -> None:
        """
        Store an encrypted configuration value.
        
        Args:
            key: Configuration key
            value: Configuration value (will be encrypted)
        """
        with self._lock:
            encrypted_value = self._encrypt(value)
            updated_at = datetime.utcnow().isoformat()
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT OR REPLACE INTO config (key, encrypted_value, updated_at)
                VALUES (?, ?, ?)
            """, (key, encrypted_value, updated_at))
            
            conn.commit()
            conn.close()
    
    def get(self, key: str, default: Optional[str] = None) -> Optional[str]:
        """
        Retrieve and decrypt a configuration value.
        
        Args:
            key: Configuration key
            default: Default value if key not found
            
        Returns:
            Decrypted value or default
        """
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT encrypted_value FROM config WHERE key = ?
            """, (key,))
            
            row = cursor.fetchone()
            conn.close()
            
            if row is None:
                return default
            
            try:
                return self._decrypt(row[0])
            except Exception as e:
                print(f"[ConfigDB] Error decrypting value for key '{key}': {e}")
                return default
    
    def delete(self, key: str) -> bool:
        """
        Delete a configuration value.
        
        Args:
            key: Configuration key
            
        Returns:
            True if deleted, False if key didn't exist
        """
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("DELETE FROM config WHERE key = ?", (key,))
            deleted = cursor.rowcount > 0
            
            conn.commit()
            conn.close()
            
            return deleted
    
    def exists(self, key: str) -> bool:
        """
        Check if a configuration key exists.
        
        Args:
            key: Configuration key
            
        Returns:
            True if key exists, False otherwise
        """
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("SELECT 1 FROM config WHERE key = ? LIMIT 1", (key,))
            exists = cursor.fetchone() is not None
            
            conn.close()
            
            return exists
    
    def list_keys(self) -> list[str]:
        """
        List all configuration keys.
        
        Returns:
            List of configuration keys
        """
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("SELECT key FROM config ORDER BY key")
            keys = [row[0] for row in cursor.fetchall()]
            
            conn.close()
            
            return keys
    
    def clear_all(self) -> int:
        """
        Delete all configuration values.
        
        Returns:
            Number of deleted entries
        """
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("DELETE FROM config")
            count = cursor.rowcount
            
            conn.commit()
            conn.close()
            
            return count


# Singleton instance
_db_instance: Optional[ConfigDB] = None
_instance_lock = threading.Lock()


def get_config_db() -> ConfigDB:
    """Get the singleton ConfigDB instance."""
    global _db_instance
    
    if _db_instance is None:
        with _instance_lock:
            if _db_instance is None:
                _db_instance = ConfigDB()
    
    return _db_instance
