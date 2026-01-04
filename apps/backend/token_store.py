import json
import os
from datetime import datetime
from typing import Optional, Dict
from config_manager import get_config_manager

config = get_config_manager()
TOKEN_FILE = os.path.join(config.get("SVCS_ROOT", "/svcs-data"), "refresh_tokens.json")

def _load_tokens() -> Dict:
    if not os.path.exists(TOKEN_FILE):
        return {}
    try:
        with open(TOKEN_FILE, "r") as f:
            return json.load(f)
    except:
        return {}

def _save_tokens(tokens: Dict):
    os.makedirs(os.path.dirname(TOKEN_FILE), exist_ok=True)
    with open(TOKEN_FILE, "w") as f:
        json.dump(tokens, f, indent=2)

def store_refresh_token(username: str, token: str, fingerprint: str, expires_at: datetime):
    tokens = _load_tokens()
    if username not in tokens:
        tokens[username] = {}
    
    tokens[username][token] = {
        "fingerprint": fingerprint,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.utcnow().isoformat()
    }
    _save_tokens(tokens)

def verify_and_rotate_token(username: str, old_token: str, new_token: str, fingerprint: str, expires_at: datetime) -> bool:
    tokens = _load_tokens()
    user_tokens = tokens.get(username, {})
    
    if old_token not in user_tokens:
        return False
    
    token_data = user_tokens[old_token]
    
    # Check fingerprint
    if token_data["fingerprint"] != fingerprint:
        # Potential theft! Invalidate all tokens for this user as a precaution
        del tokens[username]
        _save_tokens(tokens)
        return False
    
    # Check expiry
    if datetime.fromisoformat(token_data["expires_at"]) < datetime.utcnow():
        del tokens[username][old_token]
        _save_tokens(tokens)
        return False
    
    # Rotate: remove old, add new
    del tokens[username][old_token]
    tokens[username][new_token] = {
        "fingerprint": fingerprint,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.utcnow().isoformat()
    }
    _save_tokens(tokens)
    return True

def invalidate_token(username: str, token: str):
    tokens = _load_tokens()
    if username in tokens and token in tokens[username]:
        del tokens[username][token]
        _save_tokens(tokens)

def invalidate_all_user_tokens(username: str):
    tokens = _load_tokens()
    if username in tokens:
        del tokens[username]
        _save_tokens(tokens)
