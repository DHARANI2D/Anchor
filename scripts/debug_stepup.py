import requests
import json
import os

API_URL = "http://localhost:8001"
USERNAME = "admin"
PASSWORD = "admin"

session = requests.Session()

# Login
print("Logging in...")
res = session.post(f"{API_URL}/auth/login", json={"username": USERNAME, "password": PASSWORD})
print(f"Login status: {res.status_code}")
if res.status_code != 200:
    print(res.text)
    exit(1)

data = res.json()
token = data.get("access_token")
if not token:
    if data.get("status") == "2fa_required":
        print("2FA required. Enter code:")
        code = input()
        res = session.post(f"{API_URL}/auth/login/2fa", json={"username": USERNAME, "code": code})
        print(f"2FA Login status: {res.status_code}")
        data = res.json()
        token = data.get("access_token")

if not token:
    print("No token.")
    exit(1)

print("Logged in. Token:", token[:10] + "...")

# Step-up
print("Calling step-up...")
headers = {"Authorization": f"Bearer {token}"}
res = session.post(f"{API_URL}/auth/step-up", json={"password": PASSWORD}, headers=headers)
print(f"Step-up status: {res.status_code}")
print(res.text)
