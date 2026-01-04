#!/usr/bin/env python3
"""
Configuration Migration Script

Migrates configuration values from .env file to encrypted database.
Creates a backup of the original .env file before migration.
"""

import os
import sys
import shutil
from pathlib import Path
from datetime import datetime

# Add backend directory to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from config_manager import get_config_manager
from dotenv import dotenv_values


def backup_env_file(env_path: Path) -> Path:
    """Create a backup of the .env file."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = env_path.parent / f".env.backup_{timestamp}"
    shutil.copy2(env_path, backup_path)
    print(f"✓ Created backup: {backup_path}")
    return backup_path


def load_env_values(env_path: Path) -> dict:
    """Load values from .env file."""
    if not env_path.exists():
        print(f"✗ .env file not found at {env_path}")
        return {}
    
    values = dotenv_values(env_path)
    print(f"✓ Loaded {len(values)} values from .env file")
    return values


def migrate_to_database(values: dict) -> None:
    """Migrate values to encrypted database."""
    config = get_config_manager()
    
    migrated = 0
    skipped = 0
    
    for key, value in values.items():
        if value is None or value == "":
            print(f"  ⊘ Skipping empty value for: {key}")
            skipped += 1
            continue
        
        try:
            config.set(key, value)
            print(f"  ✓ Migrated: {key}")
            migrated += 1
        except Exception as e:
            print(f"  ✗ Failed to migrate {key}: {e}")
    
    print(f"\n✓ Migration complete: {migrated} values migrated, {skipped} skipped")


def verify_migration(original_values: dict) -> bool:
    """Verify that all values were migrated correctly."""
    config = get_config_manager()
    
    print("\n=== Verification ===")
    all_valid = True
    
    for key, original_value in original_values.items():
        if original_value is None or original_value == "":
            continue
        
        migrated_value = config.get(key, use_env_fallback=False)
        
        if migrated_value == original_value:
            print(f"  ✓ {key}: OK")
        else:
            print(f"  ✗ {key}: MISMATCH (expected: {original_value[:20]}..., got: {migrated_value})")
            all_valid = False
    
    return all_valid


def main():
    """Main migration function."""
    print("=" * 60)
    print("Configuration Migration: .env → Encrypted Database")
    print("=" * 60)
    
    # Locate .env file
    env_path = backend_dir.parent / ".env"
    
    if not env_path.exists():
        print(f"\n✗ No .env file found at {env_path}")
        print("Nothing to migrate.")
        return 0
    
    print(f"\nSource: {env_path}")
    
    # Load values from .env
    print("\n=== Loading Configuration ===")
    values = load_env_values(env_path)
    
    if not values:
        print("No values to migrate.")
        return 0
    
    # Show what will be migrated
    print("\nThe following keys will be migrated:")
    for key in values.keys():
        print(f"  • {key}")
    
    # Confirm migration
    print("\n" + "=" * 60)
    response = input("Proceed with migration? [y/N]: ").strip().lower()
    
    if response not in ('y', 'yes'):
        print("Migration cancelled.")
        return 0
    
    # Create backup
    print("\n=== Creating Backup ===")
    backup_path = backup_env_file(env_path)
    
    # Migrate to database
    print("\n=== Migrating to Database ===")
    migrate_to_database(values)
    
    # Verify migration
    if verify_migration(values):
        print("\n✓ All values verified successfully!")
        
        # Offer to rename .env file
        print("\n" + "=" * 60)
        print("Migration successful!")
        print(f"Backup saved to: {backup_path}")
        print("\nTo complete the migration, you can rename the .env file:")
        print(f"  mv {env_path} {env_path.parent}/.env.old")
        print("\nThe application will now read from the encrypted database.")
        
        return 0
    else:
        print("\n✗ Verification failed! Please check the errors above.")
        print(f"Original .env file is backed up at: {backup_path}")
        return 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n\nMigration cancelled by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ Migration failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
