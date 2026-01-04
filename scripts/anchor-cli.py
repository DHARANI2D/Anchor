#!/usr/bin/env python3
import os
import sys
import json
import requests
import argparse
import base64
import pickle
from typing import Optional
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import serialization

API_BASE_URL = os.getenv("ANCHOR_API_URL", "http://localhost:8001")
TOKEN_FILE = os.path.expanduser("~/.anchor_token")
COOKIE_FILE = os.path.expanduser("~/.anchor_cookies")

def save_token(token: str):
    with open(TOKEN_FILE, "w") as f:
        f.write(token)

def load_token() -> Optional[str]:
    if os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE, "r") as f:
            return f.read().strip()
    return None

def save_cookies(session):
    with open(COOKIE_FILE, 'wb') as f:
        pickle.dump(session.cookies, f)

def load_cookies(session):
    if os.path.exists(COOKIE_FILE):
        with open(COOKIE_FILE, 'rb') as f:
            session.cookies.update(pickle.load(f))

def get_session():
    session = requests.Session()
    load_cookies(session)
    return session

def authenticated_request(method, path, **kwargs):
    session = get_session()
    token = load_token()
    if token:
        headers = kwargs.get("headers", {})
        headers["Authorization"] = f"Bearer {token}"
        kwargs["headers"] = headers
    
    url = f"{API_BASE_URL}{path}"
    res = session.request(method, url, **kwargs)
    
    if res.status_code == 401 and path != "/auth/refresh":
        # Try to refresh
        print("Access token expired, attempting refresh...")
        refresh_res = session.post(f"{API_BASE_URL}/auth/refresh")
        if refresh_res.status_code == 200:
            new_token = refresh_res.json()["access_token"]
            save_token(new_token)
            save_cookies(session)
            # Retry
            headers = kwargs.get("headers", {})
            headers["Authorization"] = f"Bearer {new_token}"
            kwargs["headers"] = headers
            res = session.request(method, url, **kwargs)
        else:
            print("Session expired. Please login again.")
            if os.path.exists(TOKEN_FILE): os.remove(TOKEN_FILE)
            if os.path.exists(COOKIE_FILE): os.remove(COOKIE_FILE)
    
    save_cookies(session)
    return res

def login(username, password):
    session = requests.Session()
    res = session.post(f"{API_BASE_URL}/auth/login", json={"username": username, "password": password})
    if res.status_code == 200:
        data = res.json()
        if data.get("status") == "2fa_required":
            code = input("2FA Code Required: ")
            res = session.post(f"{API_BASE_URL}/auth/login/2fa", json={"username": username, "code": code})
            if res.status_code == 200:
                data = res.json()
            else:
                print(f"2FA Login failed: {res.json().get('detail', 'Unknown error')}")
                return

        if "access_token" in data:
            token = data["access_token"]
            save_token(token)
            save_cookies(session)
            print("Login successful!")
        else:
             print(f"Login failed: Missing access token in response: {data}")
    else:
        print(f"Login failed: {res.json().get('detail', 'Unknown error')}")

def derive_public_key_and_id(private_key):
    public_key = private_key.public_key()
    ssh_public_key_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.OpenSSH,
        format=serialization.PublicFormat.OpenSSH
    )
    ssh_public_key_str = ssh_public_key_bytes.decode('utf-8')
    import hashlib
    key_id = hashlib.sha256(ssh_public_key_str.encode()).hexdigest()[:8]
    return ssh_public_key_str, key_id

def load_private_key(path):
    with open(path, "rb") as f:
        data = f.read()
    
    try:
        return serialization.load_pem_private_key(data, password=None)
    except ValueError:
        try:
             # Try OpenSSH format if available in this version of cryptography
            return serialization.load_ssh_private_key(data, password=None)
        except Exception:
            raise

def ssh_login(username, key_path):
    try:
        private_key = load_private_key(os.path.expanduser(key_path))
        
        # Derive public key and ID
        pub_key_str, derived_key_id = derive_public_key_and_id(private_key)
        print(f"Using key: {key_path}")
        print(f"Derived Key ID: {derived_key_id}")
        
    except Exception as e:
        print(f"Error loading private key: {e}")
        return

    session = requests.Session()
    res = session.get(f"{API_BASE_URL}/auth/ssh-challenge", params={"username": username})
    if res.status_code != 200:
        print(f"Failed to get challenge: {res.text}")
        return
    challenge = res.json()["challenge"]
    
    try:
        signature = private_key.sign(challenge.encode(), padding.PKCS1v15(), hashes.SHA256())
        sig_b64 = base64.b64encode(signature).decode()
        
        # Try login with derived ID
        res = session.post(f"{API_BASE_URL}/auth/ssh-login", json={
            "username": username,
            "signature": sig_b64,
            "key_id": derived_key_id
        })
        
        if res.status_code == 200:
            token = res.json()["access_token"]
            save_token(token)
            save_cookies(session)
            print("SSH Login successful!")
        else:
            print(f"SSH Login failed: {res.json().get('detail', 'Unknown error')}")
            print("Note: The backend ID depends on the exact string uploaded (including comments).")
            print("If you uploaded the key with a comment, this derived ID (no comment) might not match.")
    except Exception as e:
        print(f"Error during SSH login: {e}")

def list_repos():
    res = authenticated_request("GET", "/repos")
    if res.status_code == 200:
        repos = res.json()
        for repo in repos:
            print(f"- {repo['name']}")
    else:
        print(f"Failed to list repos: {res.status_code}")

def status():
    res = requests.get(f"{API_BASE_URL}/status")
    if res.status_code == 200:
        data = res.json()
        print(f"Status: {data['status']}")
        print(f"Uptime: {data['uptime']}")
        print(f"Version: {data['version']}")
        print(f"Repositories: {data['storage']['repositories']}")
    else:
        print(f"Failed to get status: {res.status_code}")

def main():
    parser = argparse.ArgumentParser(description="Anchor CLI")
    subparsers = parser.add_subparsers(dest="command")

    login_parser = subparsers.add_parser("login", help="Login to Anchor")
    login_parser.add_argument("username")
    login_parser.add_argument("password")

    ssh_parser = subparsers.add_parser("ssh-login", help="Login via SSH key")
    ssh_parser.add_argument("username")
    ssh_parser.add_argument("key_path")

    subparsers.add_parser("list", help="List repositories")
    subparsers.add_parser("status", help="Check system status")

    args = parser.parse_args()

    if args.command == "login":
        login(args.username, args.password)
    elif args.command == "ssh-login":
        ssh_login(args.username, args.key_path)
    elif args.command == "list":
        list_repos()
    elif args.command == "status":
        status()
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
