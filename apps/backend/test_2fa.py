import requests
import pyotp
import time
import sys
import os

API_BASE_URL = os.getenv("ANCHOR_API_URL", "http://localhost:8001")
ADMIN_USER = "admin"
ADMIN_PASS = "anchor2025"

def test_2fa_flow():
    print(f"Starting 2FA test against {API_BASE_URL}...")
    session = requests.Session()
    
    # 1. Login
    print("1. Logging in...")
    login_res = session.post(f"{API_BASE_URL}/auth/login", json={
        "username": ADMIN_USER,
        "password": ADMIN_PASS
    })
    if login_res.status_code != 200:
        print(f"Login failed: {login_res.text}")
        return
    
    res_data = login_res.json()
    if res_data.get("status") == "2fa_required":
        print("2FA is already enabled. We need to disable it first to test the full flow.")
        # We need a code. This script can't know the secret unless it's stored.
        # So for this test script, deleting the 2FA state is easier if we want a fresh run.
        # But let's try to proceed if we can.
        print("Please reset 2FA state manually (rm data/users/admin/auth_2fa.json) or update this script.")
        return

    token = res_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Check if 2FA is already enabled, if so, we should disable it first or use a different user
    # But for a test environment, let's assume we can reset it.
    
    # 2. Get 2FA Setup
    print("2. Getting 2FA setup details...")
    setup_res = session.post(f"{API_BASE_URL}/user/2fa/setup", headers=headers)
    if setup_res.status_code != 200:
        print(f"Setup failed: {setup_res.text}")
        # If already enabled, status code might be 400
        if "already enabled" in setup_res.text:
            print("2FA is already enabled. Attempting to disable it first (requires step-up).")
            # Step-up first
            step_up_res = session.post(f"{API_BASE_URL}/auth/step-up", json={"password": ADMIN_PASS}, headers=headers)
            if step_up_res.status_code == 200:
                step_up_token = step_up_res.json()["access_token"]
                step_up_headers = {"Authorization": f"Bearer {step_up_token}"}
                disable_res = session.post(f"{API_BASE_URL}/user/2fa/disable", headers=step_up_headers)
                if disable_res.status_code == 200:
                    print("2FA disabled. Retrying setup...")
                    setup_res = session.post(f"{API_BASE_URL}/user/2fa/setup", headers=headers)
                else:
                    print(f"Failed to disable 2FA: {disable_res.text}")
                    return
            else:
                print(f"Step-up failed: {step_up_res.text}")
                return
        else:
            return

    setup_data = setup_res.json()
    secret = setup_data["secret"]
    print(f"Secret received: {secret}")
    
    # 3. Generate TOTP code
    totp = pyotp.TOTP(secret)
    current_code = totp.now()
    print(f"Generated TOTP code: {current_code}")
    
    # 4. Enable 2FA
    print("4. Enabling 2FA...")
    enable_res = session.post(f"{API_BASE_URL}/user/2fa/enable", json={"code": current_code, "secret": secret}, headers=headers)
    if enable_res.status_code != 200:
        print(f"Enable failed: {enable_res.text}")
        return
    print("2FA enabled successfully!")
    
    # 5. Verify Status
    status_res = session.get(f"{API_BASE_URL}/user/2fa/status", headers=headers)
    print(f"2FA Status: {status_res.json()}")
    
    # 6. Test Login with 2FA
    print("6. Testing login with 2FA requirements...")
    # Clear session/cookies to start fresh
    session = requests.Session()
    login_res = session.post(f"{API_BASE_URL}/auth/login", json={
        "username": ADMIN_USER,
        "password": ADMIN_PASS
    })
    
    if login_res.status_code == 200:
        res_data = login_res.json()
        if res_data.get("status") == "2fa_required":
            print("Login correctly reported 2fa_required.")
            
            # 7. Complete login with 2FA
            print("7. Completing login with 2FA code...")
            mfa_code = totp.now()
            mfa_res = session.post(f"{API_BASE_URL}/auth/login/2fa", json={
                "username": ADMIN_USER,
                "code": mfa_code
            })
            
            if mfa_res.status_code == 200:
                print("MFA Login successful!")
                final_token = mfa_res.json()["access_token"]
                # Verify we can access a protected endpoint
                profile_res = session.get(f"{API_BASE_URL}/user/profile", headers={"Authorization": f"Bearer {final_token}"})
                if profile_res.status_code == 200:
                    print(f"Profile access successful: {profile_res.json()['username']}")
                    print("EVERYTHING PASSED!")
                else:
                    print(f"Profile access failed: {profile_res.text}")
            else:
                print(f"MFA Login failed: {mfa_res.text}")
        else:
            print(f"Login did not require 2FA as expected. Response: {login_res.text}")
    else:
        print(f"Initial login failed: {login_res.text}")

if __name__ == "__main__":
    test_2fa_flow()
