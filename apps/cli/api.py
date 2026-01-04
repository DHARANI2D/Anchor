import requests
import pickle
import os
from .utils import API_BASE_URL, TOKEN_FILE, COOKIE_FILE, save_token, load_token

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
