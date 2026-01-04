import os

API_BASE_URL = os.getenv("ANCHOR_API_URL", "http://localhost:8001")
TOKEN_FILE = os.path.expanduser("~/.anchor_token")
COOKIE_FILE = os.path.expanduser("~/.anchor_cookies")

def save_token(token: str):
    with open(TOKEN_FILE, "w") as f:
        f.write(token)

def load_token():
    if os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE, "r") as f:
            return f.read().strip()
    return None
