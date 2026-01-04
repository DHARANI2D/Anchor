import requests
from .api import authenticated_request, API_BASE_URL

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

def create(name, password_arg=None):
    # This requires step-up, so we might need to prompt password or use existing token if it has permissions?
    # Actually require_step_up checks for `step_up=True` in token.
    # We might need to implement the step-up flow here:
    # 1. Try create.
    # 2. If 403/401 step-up required, prompt password, get step-up token, retry.
    
    session = requests.Session() # New session or existing? authenticated_request uses transient session.
    # We need to maintain session for cookies? 
    # authenticated_request manages cookies.
    
    # Try with current token
    res = authenticated_request("POST", "/repos/", json={"name": name})
    
    if res.status_code == 403 or "Step-up authentication required" in res.text:
        print("Step-up authentication required to create repository.")
        from .utils import save_token, load_token
        from .api import get_session, save_cookies, API_BASE_URL
        
        if password_arg:
             password = password_arg
        else:
             password = input("Password: ")
        
        session = get_session() # Load cookies
        token = load_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        su_res = session.post(f"{API_BASE_URL}/auth/step-up", json={"password": password}, headers=headers)
        if su_res.status_code == 200:
            su_token = su_res.json()["access_token"]
            # Save this token? It's a short lived step-up token?
            # Or just use it for this request.
            # Usually step-up token replaces access token?
            # The backend `step_up` returns a new access token with `step_up=True`.
            save_token(su_token)
            save_cookies(session)
            print("Authenticated. Retrying...")
            
            # Retry creation
            res = authenticated_request("POST", "/repos/", json={"name": name})
        else:
            print(f"Step-up failed: {su_res.text}")
            return

    if res.status_code in [200, 201]:
        print(f"Repository '{name}' created successfully.")
    else:
        print(f"Failed to create repo: {res.text}")

def favorite(name, status=True):
    """Toggle favorite status for a repository."""
    res = authenticated_request("PATCH", f"/repos/{name}/favorite", params={"is_favorite": status})
    if res.status_code == 200:
        action = "favorited" if status else "unfavorited"
        print(f"Repository '{name}' {action}.")
    else:
        print(f"Failed to update favorite status: {res.status_code}")
