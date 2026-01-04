import requests
import os
import base64
import hashlib
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import serialization
from .utils import API_BASE_URL, save_token
from .api import save_cookies

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
    key_id = hashlib.sha256(ssh_public_key_str.encode()).hexdigest()[:8]
    return ssh_public_key_str, key_id

def load_private_key(path):
    with open(path, "rb") as f:
        data = f.read()
    
    try:
        return serialization.load_pem_private_key(data, password=None)
    except ValueError:
        try:
            return serialization.load_ssh_private_key(data, password=None)
        except Exception:
            raise

def ssh_login(username, key_path):
    try:
        private_key = load_private_key(os.path.expanduser(key_path))
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
        # Ed25519 keys use sign() without padding/hash parameters
        # RSA keys use sign(data, padding, hash)
        from cryptography.hazmat.primitives.asymmetric import ed25519, rsa
        
        if isinstance(private_key, ed25519.Ed25519PrivateKey):
            signature = private_key.sign(challenge.encode())
        elif isinstance(private_key, rsa.RSAPrivateKey):
            signature = private_key.sign(challenge.encode(), padding.PKCS1v15(), hashes.SHA256())
        else:
            print(f"Unsupported key type: {type(private_key)}")
            return
            
        sig_b64 = base64.b64encode(signature).decode()
        
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
