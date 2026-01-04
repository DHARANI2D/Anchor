import os
import json
import hashlib
import fcntl
from typing import Dict, Any, List
from config_manager import get_config_manager

config = get_config_manager()
SVCS_ROOT = config.get("SVCS_ROOT", "/svcs-data")

def _lock_repo(repo_path: str):
    lock_file = os.path.join(repo_path, "repo.lock")
    fd = os.open(lock_file, os.O_CREAT | os.O_RDWR)
    fcntl.flock(fd, fcntl.LOCK_EX)
    return fd

def _unlock_repo(fd):
    fcntl.flock(fd, fcntl.LOCK_UN)
    os.close(fd)

def init_repo(name: str) -> str:
    repo_path = os.path.join(SVCS_ROOT, name)
    os.makedirs(repo_path, exist_ok=True)
    # meta.json
    meta = {"name": name, "created_at": "2025-12-19T09:00:00Z"}
    with open(os.path.join(repo_path, "meta.json"), "w") as f:
        json.dump(meta, f)
    # empty refs/main
    os.makedirs(os.path.join(repo_path, "refs"), exist_ok=True)
    with open(os.path.join(repo_path, "refs", "main"), "w") as f:
        f.write("")
    return repo_path

def _hash_content(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()

def save_snapshot(repo_name: str, message: str, work_dir: str) -> str:
    repo_path = os.path.join(SVCS_ROOT, repo_name)
    lock_fd = _lock_repo(repo_path)
    try:
        # Load previous snapshot id
        ref_path = os.path.join(repo_path, "refs", "main")
        parent = "".strip()
        if os.path.exists(ref_path):
            with open(ref_path) as f:
                parent = f.read().strip()
        # Walk work_dir, create blobs
        blobs_dir = os.path.join(repo_path, "objects", "blobs")
        trees_dir = os.path.join(repo_path, "objects", "trees")
        snapshots_dir = os.path.join(repo_path, "objects", "snapshots")
        os.makedirs(blobs_dir, exist_ok=True)
        os.makedirs(trees_dir, exist_ok=True)
        os.makedirs(snapshots_dir, exist_ok=True)
        tree = _build_tree(work_dir, blobs_dir)
        tree_id = _store_tree(tree, trees_dir)
        # Create snapshot json
        snapshot_id = f"s_{int(hashlib.sha256((tree_id + parent).encode()).hexdigest()[:8], 16)}"
        snapshot = {
            "snapshot_id": snapshot_id,
            "root_tree": tree_id,
            "parent": parent or None,
            "message": message,
            "timestamp": "2025-12-19T09:00:00Z",
        }
        with open(os.path.join(snapshots_dir, f"{snapshot_id}.json"), "w") as f:
            json.dump(snapshot, f)
        # Update ref
        with open(ref_path, "w") as f:
            f.write(snapshot_id)
        return snapshot_id
    finally:
        _unlock_repo(lock_fd)

def _build_tree(base_path: str, blobs_dir: str) -> Dict[str, Any]:
    entries = {}
    for root, dirs, files in os.walk(base_path):
        rel_root = os.path.relpath(root, base_path)
        for f in files:
            file_path = os.path.join(root, f)
            with open(file_path, "rb") as fh:
                data = fh.read()
            blob_id = _hash_content(data)
            # store blob if not exists
            sub = os.path.join(blobs_dir, blob_id[:2], blob_id[2:4])
            os.makedirs(sub, exist_ok=True)
            blob_path = os.path.join(sub, f"{blob_id}.blob")
            if not os.path.exists(blob_path):
                with open(blob_path, "wb") as bf:
                    bf.write(data)
            # record entry
            rel_file = os.path.normpath(os.path.join(rel_root, f)) if rel_root != "." else f
            entries[rel_file] = {"type": "blob", "id": blob_id}
    return {"entries": entries}

def _store_tree(tree: Dict[str, Any], trees_dir: str) -> str:
    tree_json = json.dumps(tree, sort_keys=True).encode()
    tree_id = hashlib.sha256(tree_json).hexdigest()
    path = os.path.join(trees_dir, f"{tree_id}.json")
    with open(path, "w") as f:
        json.dump(tree, f)
    return tree_id
def get_history(repo_name: str) -> List[Dict[str, Any]]:
    repo_path = os.path.join(SVCS_ROOT, repo_name)
    ref_path = os.path.join(repo_path, "refs", "main")
    if not os.path.exists(ref_path):
        return []
    with open(ref_path) as f:
        current_id = f.read().strip()
    
    history = []
    while current_id:
        snapshot_path = os.path.join(repo_path, "objects", "snapshots", f"{current_id}.json")
        if not os.path.exists(snapshot_path):
            break
        with open(snapshot_path) as f:
            snapshot = json.load(f)
        history.append(snapshot)
        current_id = snapshot.get("parent")
    return history

def get_diff(repo_name: str, from_id: str, to_id: str) -> Dict[str, Any]:
    repo_path = os.path.join(SVCS_ROOT, repo_name)
    def _load_tree(snapshot_id):
        snapshot_path = os.path.join(repo_path, "objects", "snapshots", f"{snapshot_id}.json")
        with open(snapshot_path) as f:
            snap = json.load(f)
        tree_path = os.path.join(repo_path, "objects", "trees", f"{snap['root_tree']}.json")
        with open(tree_path) as f:
            return json.load(f)

    tree_from = _load_tree(from_id)
    tree_to = _load_tree(to_id)
    
    entries_from = tree_from.get("entries", {})
    entries_to = tree_to.get("entries", {})
    
    diff = {"added": [], "removed": [], "modified": []}
    
    all_paths = set(entries_from.keys()) | set(entries_to.keys())
    for path in all_paths:
        if path not in entries_from:
            diff["added"].append(path)
        elif path not in entries_to:
            diff["removed"].append(path)
        elif entries_from[path]["id"] != entries_to[path]["id"]:
            diff["modified"].append(path)
            
    return diff
def unzip_and_save_snapshot(repo_name: str, message: str, zip_path: str) -> str:
    import zipfile
    import shutil
    import tempfile
    
    work_dir = tempfile.mkdtemp(prefix=f"anchor_{repo_name}_")
    try:
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(work_dir)
        return save_snapshot(repo_name, message, work_dir)
    finally:
        shutil.rmtree(work_dir)

def get_user_profile(username: str) -> Dict[str, Any]:
    profile_path = os.path.join(SVCS_ROOT, "users", username, "profile.json")
    if os.path.exists(profile_path):
        with open(profile_path) as f:
            return json.load(f)
    return {
        "username": username,
        "bio": "No bio yet.",
        "location": "Unknown",
        "website": "",
        "avatar_url": f"https://api.dicebear.com/7.x/avataaars/svg?seed={username}&accessories=prescription02"
    }

def update_user_profile(username: str, data: Dict[str, Any]) -> Dict[str, Any]:
    user_dir = os.path.join(SVCS_ROOT, "users", username)
    os.makedirs(user_dir, exist_ok=True)
    profile_path = os.path.join(user_dir, "profile.json")
    
    current = get_user_profile(username)
    current.update(data)
    
    with open(profile_path, "w") as f:
        json.dump(current, f, indent=2)
    return current

def get_user_keys(username: str) -> List[Dict[str, Any]]:
    keys_path = os.path.join(SVCS_ROOT, "users", username, "keys.json")
    if os.path.exists(keys_path):
        with open(keys_path) as f:
            return json.load(f)
    return []

def add_user_key(username: str, key_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    user_dir = os.path.join(SVCS_ROOT, "users", username)
    os.makedirs(user_dir, exist_ok=True)
    keys_path = os.path.join(user_dir, "keys.json")
    
    keys = get_user_keys(username)
    new_key = {
        "id": hashlib.sha256(key_data["key"].encode()).hexdigest()[:8],
        "title": key_data["title"],
        "key": key_data["key"],
        "created_at": "2025-12-19T09:00:00Z"
    }
    keys.append(new_key)
    
    with open(keys_path, "w") as f:
        json.dump(keys, f, indent=2)
    return keys

def delete_user_key(username: str, key_id: str) -> List[Dict[str, Any]]:
    keys_path = os.path.join(SVCS_ROOT, "users", username, "keys.json")
    if not os.path.exists(keys_path):
        return []
    
    keys = get_user_keys(username)
    keys = [k for k in keys if k["id"] != key_id]
    
    with open(keys_path, "w") as f:
        json.dump(keys, f, indent=2)
    return keys


def get_user_2fa(username: str) -> Dict[str, Any]:
    """Get 2FA status and secret for a user"""
    user_dir = os.path.join(SVCS_ROOT, "users", username)
    auth_path = os.path.join(user_dir, "auth_2fa.json")
    if os.path.exists(auth_path):
        with open(auth_path) as f:
            return json.load(f)
    return {"enabled": False, "secret": None}


def update_user_2fa(username: str, enabled: bool, secret: str | None) -> Dict[str, Any]:
    """Update 2FA status and secret for a user"""
    user_dir = os.path.join(SVCS_ROOT, "users", username)
    os.makedirs(user_dir, exist_ok=True)
    auth_path = os.path.join(user_dir, "auth_2fa.json")
    
    data = {"enabled": enabled, "secret": secret}
    with open(auth_path, "w") as f:
        json.dump(data, f, indent=2)
    return data

def rename_user(old_username: str, new_username: str) -> bool:
    """Rename user directory and update all associated data"""
    old_dir = os.path.join(SVCS_ROOT, "users", old_username)
    new_dir = os.path.join(SVCS_ROOT, "users", new_username)
    
    if not os.path.exists(old_dir):
        return False
    if os.path.exists(new_dir):
        raise ValueError(f"User {new_username} already exists")
    
    import shutil
    shutil.move(old_dir, new_dir)
    return True

def update_user_password(username: str, password_hash: str):
    """Persist a new password hash for the user"""
    user_dir = os.path.join(SVCS_ROOT, "users", username)
    os.makedirs(user_dir, exist_ok=True)
    hash_path = os.path.join(user_dir, "password.hash")
    with open(hash_path, "w") as f:
        f.write(password_hash)

def get_persisted_password_hash(username: str) -> str | None:
    """Read persisted password hash if it exists"""
    hash_path = os.path.join(SVCS_ROOT, "users", username, "password.hash")
    if os.path.exists(hash_path):
        with open(hash_path) as f:
            return f.read().strip()
    return None

def create_archive(repo_name: str, snapshot_id: str) -> str:
    """Create a zip archive of a snapshot"""
    import zipfile
    import tempfile
    import shutil
    
    repo_path = os.path.join(SVCS_ROOT, repo_name)
    
    # helper to load tree
    def _load_tree(tree_id):
        path = os.path.join(repo_path, "objects", "trees", f"{tree_id}.json")
        with open(path) as f:
            return json.load(f)
            
    # Copy from get_file logic...
    snapshot_path = os.path.join(repo_path, "objects", "snapshots", f"{snapshot_id}.json")
    if not os.path.exists(snapshot_path):
        raise FileNotFoundError("Snapshot not found")
        
    with open(snapshot_path) as f:
        snapshot = json.load(f)
    
    root_tree_id = snapshot["root_tree"]
    
    # Recursively rebuild in temp dir
    work_dir = tempfile.mkdtemp(prefix=f"anchor_export_{repo_name}_")
    try:
        def _reconstruct(tree_id, current_path):
            tree = _load_tree(tree_id)
            entries = tree.get("entries", {})
            for rel_path, info in entries.items():
                full_path = os.path.join(current_path, rel_path)
                
                if info["type"] == "blob":
                    blob_id = info["id"]
                    blob_path = os.path.join(repo_path, "objects", "blobs", blob_id[:2], blob_id[2:4], f"{blob_id}.blob")
                    os.makedirs(os.path.dirname(full_path), exist_ok=True)
                    with open(blob_path, "rb") as src, open(full_path, "wb") as dst:
                        shutil.copyfileobj(src, dst)
        
        _reconstruct(root_tree_id, work_dir)
        
        # Create zip
        zip_fd, zip_path = tempfile.mkstemp(suffix=".zip")
        os.close(zip_fd)
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            for root, dirs, files in os.walk(work_dir):
                for file in files:
                    abs_path = os.path.join(root, file)
                    rel_path = os.path.relpath(abs_path, work_dir)
                    zf.write(abs_path, rel_path)
                    
        return zip_path
    finally:
        shutil.rmtree(work_dir)
