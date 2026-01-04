#!/usr/bin/env python3
"""
Add CORS Origin to Configuration

This script allows you to add a new URL (Origin) to the allowed list.
Use this when you want to access your server from a Public IP or new domain.
"""

import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

from config_manager import get_config_manager

def main():
    print("=" * 60)
    print("Add Allowed Origin (CORS)")
    print("=" * 60)
    print()
    print("Current implementation restricts access to specific domains/IPs.")
    print("To access via your Public IP (e.g., http://85.x.x.x:8000), you must add it.")
    print()
    
    new_origin = input("Enter the URL/IP to allow (e.g., http://85.20.12.34:8000): ").strip()
    
    if not new_origin:
        print("✗ No input provided. Exiting.")
        return 1
        
    # Basic cleanup
    if not (new_origin.startswith("http://") or new_origin.startswith("https://")):
        print("⚠ Warning: URL should usually start with http:// or https://")
        confirm = input("Continue anyway? (y/n): ")
        if confirm.lower() != 'y':
            return 1

    config = get_config_manager()
    
    # Get existing
    existing = config.get("ALLOWED_ORIGINS", "")
    existing_list = [x.strip() for x in existing.split(",") if x.strip()]
    
    if new_origin in existing_list:
        print(f"✓ '{new_origin}' is already allowed.")
        return 0
        
    # Append
    existing_list.append(new_origin)
    new_value = ",".join(existing_list)
    
    config.set("ALLOWED_ORIGINS", new_value)
    
    print()
    print(f"✓ Added '{new_origin}' to allowed origins.")
    print("You may need to restart the backend for changes to take effect.")
    print()
    
    return 0

if __name__ == "__main__":
    main()
