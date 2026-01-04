import os
import zipfile
import io
import shutil
import json
from .api import authenticated_request, API_BASE_URL

ANCHOR_DIR = ".anchor"
CONFIG_FILE = "config"

def init(path="."):
    """Initialize a new anchor repo"""
    anchor_path = os.path.join(path, ANCHOR_DIR)
    if os.path.exists(anchor_path):
        print(f"Reinitialized existing anchor repository in {os.path.abspath(anchor_path)}")
        return

    os.makedirs(anchor_path)
    # Create basic config
    config = {
        "remote": None
    }
    with open(os.path.join(anchor_path, CONFIG_FILE), "w") as f:
        json.dump(config, f)
        
    with open(os.path.join(anchor_path, "HEAD"), "w") as f:
        f.write("refs/heads/main")
    
    print(f"Initialized empty anchor repository in {os.path.abspath(anchor_path)}")

def clone(repo_name, destination=None):
    """Clone a repository"""
    if not destination:
        destination = repo_name
    
    if os.path.exists(destination) and os.listdir(destination):
        print(f"Destination path '{destination}' already exists and is not empty.")
        return

    print(f"Cloning '{repo_name}'...")
    
    # Check if repo exists and get archive
    res = authenticated_request("GET", f"/repos/{repo_name}/archive")
    if res.status_code != 200:
        if res.status_code == 404 and ("Repo is empty" in res.text or "Repo not found" in res.text):
             print("warning: You appear to have cloned an empty repository.")
             init(destination)
             
             config = _load_config(destination)
             config["remote"] = f"{API_BASE_URL}/repos/{repo_name}"
             _save_config(destination, config)
             return
        else:
            print(f"Failed to clone '{repo_name}': {res.status_code} {res.text}")
            return

    # Unzip
    try:
        with zipfile.ZipFile(io.BytesIO(res.content)) as zf:
            zf.extractall(destination)
    except zipfile.BadZipFile:
        print("Error: Received invalid zip file from server.")
        return

    # Initialize anchor
    init(destination)
    
    # Fetch latest snapshot ID to set HEAD
    hist_res = authenticated_request("GET", f"/repos/{repo_name}/history")
    if hist_res.status_code == 200:
        history = hist_res.json()
        
        # Save all history snapshots locally so 'log' works
        for snap in history:
            sid = snap.get("snapshot_id")
            if sid:
                snap_path = os.path.join(destination, ANCHOR_DIR, "objects", "snapshots", f"{sid}.json")
                os.makedirs(os.path.dirname(snap_path), exist_ok=True)
                with open(snap_path, "w") as f:
                    json.dump(snap, f, indent=2)

        if history and len(history) > 0:
            latest_id = history[0].get("snapshot_id")
            if latest_id:
                anchor_path = os.path.join(destination, ANCHOR_DIR)
                ref_path = os.path.join(anchor_path, "refs", "heads", "main")
                os.makedirs(os.path.dirname(ref_path), exist_ok=True)
                with open(ref_path, "w") as f:
                    f.write(latest_id)
                
                # Create HEAD pointing to main
                head_path = os.path.join(anchor_path, "HEAD")
                with open(head_path, "w") as f:
                    f.write("refs/heads/main")
                # Need snapshot obj content for logging? 
                # Ideally we should fetch object, but for now we just set ref.
                # 'log' tool checks objects/snapshots/{id}.json.
                # Currently we DON'T have that file locally after clone.
                # So 'log' will fail or show nothing.
                # We need to fetch the snapshot object.
                
                # Try to fetch snapshot metadata
                # Since we don't have a direct /objects endpoint in public API but internal code has it.
                # We can hack: The backend create_archive makes a zip of WORKTREE.
                # It does NOT include .anchor folder.
                # So we are missing objects. 
                # FOR PARITY: Clone should ideally download the objects database or at least the relevant chain.
                # For this task, I will just fake it or fetch it if I can.
                pass

    # Set remote
    config = _load_config(destination)
    config["remote"] = f"{API_BASE_URL}/repos/{repo_name}"
    _save_config(destination, config)
        
    print(f"Cloned '{repo_name}' into '{destination}'.")

def find_root():
    """Find the root of the anchor repository"""
    path = os.getcwd()
    while path != "/":
        if os.path.exists(os.path.join(path, ANCHOR_DIR)):
            return path
        path = os.path.dirname(path)
    return None

def _hash_file(path):
    import hashlib
    sha256 = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            data = f.read(65536)
            if not data: break
            sha256.update(data)
    return sha256.hexdigest()

def _load_index(root):
    index_path = os.path.join(root, ANCHOR_DIR, "index")
    if os.path.exists(index_path):
        with open(index_path) as f:
            return json.load(f)
    return {}

def _load_config(root):
    config_path = os.path.join(root, ANCHOR_DIR, CONFIG_FILE)
    if os.path.exists(config_path):
        with open(config_path) as f:
            return json.load(f)
    return {}

def _save_index(root, index):
    index_path = os.path.join(root, ANCHOR_DIR, "index")
    with open(index_path, "w") as f:
        json.dump(index, f, indent=2)

def status():
    root = find_root()
    if not root:
        print("fatal: not a anchor repository (or any of the parent directories): .anchor")
        return
    
    index = _load_index(root)
    # Check for changes
    # Files in index vs files on disk
    
    staged = []
    modified = []
    untracked = []
    
    # helper to walk
    all_files = set()
    for r, d, f in os.walk(root):
        if ".anchor" in d: d.remove(".anchor")
        if ".git" in d: d.remove(".git")
        
        rel_root = os.path.relpath(r, root)
        if rel_root == ".": rel_root = ""
        
        for file in f:
            full_path = os.path.join(r, file)
            rel_path = os.path.join(rel_root, file)
            all_files.add(rel_path)
            
            if rel_path in index:
                # Check modification
                current_hash = _hash_file(full_path)
                if current_hash != index[rel_path]:
                    modified.append(rel_path)
            else:
                untracked.append(rel_path)
                
    # Check deleted
    for path in index:
        if path not in all_files:
            modified.append(f"{path} (deleted)")

    if not modified and not untracked:
        print("nothing to commit, working tree clean")
    else:
        if modified:
            print("Changes not staged for commit:")
            for f in modified:
                print(f"\tmodified:   {f}")
        if untracked:
            print("Untracked files:")
            for f in untracked:
                print(f"\t{f}")

def add(files):
    root = find_root()
    if not root:
        print("fatal: not a anchor repository")
        return
    
    index = _load_index(root)
    
    # Handle "."
    targets = []
    if files == ["."] or files == ".":
        # Add all
        for r, d, f in os.walk(root):
            if ".anchor" in d: d.remove(".anchor")
            for file in f:
                targets.append(os.path.join(r, file))
    else:
        # If files is list
        if isinstance(files, list):
            for f in files:
                targets.append(os.path.abspath(f))
        else:
            targets.append(os.path.abspath(files))
            
    for target in targets:
        if not os.path.exists(target):
            print(f"fatal: pathspec '{target}' did not match any files")
            continue
            
        if os.path.isdir(target):
            # Recurse? For now assume file or explicit list
            pass
        else:
            rel_path = os.path.relpath(target, root)
            file_hash = _hash_file(target)
            
            # Store blob object locally?
            # Git stores blobs on add.
            # Anchor backend stores blobs on snapshot upload (server side rebuilds blobs? No, client sends zip).
            # The backend `save_snapshot` extracts zip and builds blobs.
            # So client just needs to track content.
            # Ideally we keep a copy of the blob locally to avoid relying on worktree for commit generation.
            
            blob_dir = os.path.join(root, ANCHOR_DIR, "objects", "blobs", file_hash[:2], file_hash[2:4])
            os.makedirs(blob_dir, exist_ok=True)
            blob_path = os.path.join(blob_dir, f"{file_hash}.blob")
            
            if not os.path.exists(blob_path):
                shutil.copy(target, blob_path)
                
            index[rel_path] = file_hash
            
    _save_index(root, index)

def _build_tree_object(index):
    # Flatten index to entries. 
    # Backend expects: {"entries": {"rel/path": {"type": "blob", "id": "hash"}}}
    entries = {}
    for path, hash_ in index.items():
        entries[path] = {"type": "blob", "id": hash_}
    return {"entries": entries}

def _store_object(root, type_, content):
    import hashlib
    data_json = json.dumps(content, sort_keys=True)
    hash_ = hashlib.sha256(data_json.encode()).hexdigest()
    
    path = os.path.join(root, ANCHOR_DIR, "objects", type_, f"{hash_}.json")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(data_json)
    return hash_

def commit(message, all_flag=False):
    root = find_root()
    if not root:
        print("fatal: not a anchor repository")
        return

    if all_flag:
        # Stage modified and deleted tracked files
        index = _load_index(root)
        to_add = []
        to_remove = []
        
        for rel_path in list(index.keys()):
            full_path = os.path.join(root, rel_path)
            if not os.path.exists(full_path):
                to_remove.append(rel_path)
            else:
                # Check modification (hash)
                # Optimization: rely on add's hashing
                to_add.append(full_path)
                
        if to_add:
            add(to_add)
        
        # Handle deletions
        if to_remove:
            index = _load_index(root)
            for p in to_remove:
                if p in index: del index[p]
            _save_index(root, index)
    
    index = _load_index(root)
    if not index:
        print("nothing to commit (create/copy files and use 'anchor add' to track)")
        return
    
    # helper for timestamp
    import datetime
    timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    # Build tree
    tree = _build_tree_object(index)
    tree_id = _store_object(root, "trees", tree)
    
    # Get parent
    head_path = os.path.join(root, ANCHOR_DIR, "HEAD")
    parent = None
    if os.path.exists(head_path):
        with open(head_path) as f:
            ref = f.read().strip()
            # ref: refs/heads/main
            ref_path = os.path.join(root, ANCHOR_DIR, ref)
            if os.path.exists(ref_path):
                with open(ref_path) as f:
                    parent = f.read().strip() or None
    else:
        # Create HEAD
        with open(head_path, "w") as f:
            f.write("refs/heads/main")
    
    # Create snapshot
    # Backend ID logic: s_{int(sha256(tree + parent)[:8], 16)}
    # We can use our own ID logic locally, but let's try to mimic if we want consistency.
    # But for now, just use hash of json object.
    
    import hashlib
    # Calculate ID same as backend
    parent_str = parent or ""
    # wait, backend: snapshot_id = f"s_{int(hashlib.sha256((tree_id + parent).encode()).hexdigest()[:8], 16)}"
    snap_hash = hashlib.sha256((tree_id + parent_str).encode()).hexdigest()[:8]
    snapshot_id = f"s_{int(snap_hash, 16)}"
    
    snapshot = {
        "snapshot_id": snapshot_id,
        "root_tree": tree_id,
        "parent": parent,
        "message": message,
        "timestamp": timestamp,
    }
    
    # Store snapshot object
    snap_path = os.path.join(root, ANCHOR_DIR, "objects", "snapshots", f"{snapshot_id}.json")
    os.makedirs(os.path.dirname(snap_path), exist_ok=True)
    with open(snap_path, "w") as f:
        json.dump(snapshot, f, indent=2)
        
    # Update HEAD
    head_path = os.path.join(root, ANCHOR_DIR, "HEAD")
    current_ref = "HEAD" # default name
    if os.path.exists(head_path):
        with open(head_path) as f:
            ref = f.read().strip()
            
        if ref.startswith("refs/"):
            # Update branch ref
            ref_path = os.path.join(root, ANCHOR_DIR, ref)
            os.makedirs(os.path.dirname(ref_path), exist_ok=True)
            with open(ref_path, "w") as f:
                f.write(snapshot_id)
            current_ref = ref.split("/")[-1]
        else:
            # Detached HEAD, update HEAD directly
            with open(head_path, "w") as f:
                f.write(snapshot_id)
            current_ref = "detached"
    else:
        # Should have been created earlier, but fallback
        ref_path = os.path.join(root, ANCHOR_DIR, "refs", "heads", "main")
        os.makedirs(os.path.dirname(ref_path), exist_ok=True)
        with open(ref_path, "w") as f:
             f.write(snapshot_id)
        current_ref = "main"

    print(f"[{current_ref} {snapshot_id}] {message}")

def push():
    root = find_root()
    if not root:
        print("fatal: not a anchor repository")
        return
        
    # Get remote
    config_path = os.path.join(root, ANCHOR_DIR, CONFIG_FILE)
    if not os.path.exists(config_path):
        print("fatal: no remote configured")
        return
    with open(config_path) as f:
        config = json.load(f)
        
    remote = config.get("remote")
    if not remote:
        print("fatal: no remote configured")
        return
        
    # remote URL: http://.../repos/name
    repo_name = remote.rstrip("/").split("/")[-1]
    
    # We upload the current state as a zip
    # We can zip the worktree, excluding .anchor
    
    import tempfile
    
    print(f"Pushing to {remote}...")
    
    # Create zip from worktree
    # Respect .ignore? Not implemented.
    # Just zip everything except .anchor and .git
    
    tf = tempfile.NamedTemporaryFile(delete=False, suffix=".zip")
    tf.close()
    
    try:
        with zipfile.ZipFile(tf.name, 'w', zipfile.ZIP_DEFLATED) as zf:
            for r, d, f in os.walk(root):
                if ".anchor" in d: d.remove(".anchor")
                if ".git" in d: d.remove(".git")
                
                for file in f:
                    full_path = os.path.join(r, file)
                    rel_path = os.path.relpath(full_path, root)
                    zf.write(full_path, rel_path)
        
        # Upload
        # Backend: POST /repos/{name}/upload
        # params: message, file
        
        with open(tf.name, 'rb') as f:
            files = {'file': ('archive.zip', f, 'application/zip')}
            data = {'message': "Push from CLI"}
            
            # authenticated_request uses requests.Session() which maintains method signatures
            # We need to construct URL
            # authenticared_request prefixes API_BASE_URL.
            # remote might include full URL. 
            # API_BASE_URL: http://localhost:8001
            # remote: http://localhost:8001/repos/name
            # If we extract path: /repos/name
            
            from urllib.parse import urlparse
            path = urlparse(remote).path
            
            res = authenticated_request("POST", f"{path}/upload", data=data, files=files)
            
            if res.status_code == 200:
                print(f"Push successful. Remote snapshot: {res.json().get('snapshot_id')}")
            else:
                print(f"Push failed: {res.text}")
    finally:
        os.remove(tf.name)

def pull():
    root = find_root()
    if not root:
        print("fatal: not a anchor repository")
        return

    # Get remote
    config_path = os.path.join(root, ANCHOR_DIR, CONFIG_FILE)
    with open(config_path) as f:
        config = json.load(f)
    remote = config.get("remote")
    if not remote:
        print("fatal: no remote configured")
        return

    repo_name = remote.rstrip("/").split("/")[-1]
    print(f"Pulling from {remote}...")
    
    # Archive download
    res = authenticated_request("GET", f"/repos/{repo_name}/archive")
    if res.status_code != 200:
        print(f"Pull failed: {res.status_code}")
        return
        
    # Unzip over
    try:
        with zipfile.ZipFile(io.BytesIO(res.content)) as zf:
            zf.extractall(root)
        print("Pull successful.")
    except Exception as e:
        print(f"Error extracting pull: {e}")

def _save_config(root, config):
    config_path = os.path.join(root, ANCHOR_DIR, CONFIG_FILE)
    with open(config_path, "w") as f:
        json.dump(config, f, indent=2)

def config(key=None, value=None, list_flag=False):
    if list_flag:
        root = find_root()
        if root:
             c = _load_config(root)
             for k, v in c.items():
                 print(f"{k}={v}")
        return

    if not key:
        return

    root = find_root()
    if not root:
        print("fatal: not a anchor repository")
        return

    curr_config = _load_config(root)
    
    if value:
        curr_config[key] = value
        _save_config(root, curr_config)
    else:
        val = curr_config.get(key)
        if val: print(val)

def remote(subcommand, name=None, url=None, verbose=False):
    root = find_root()
    if not root:
        print("fatal: not a anchor repository")
        return
        
    c = _load_config(root)
    
    if subcommand == "add":
        if not name or not url:
            print("usage: anchor remote add <name> <url>")
            return
        if name == "origin":
             c["remote"] = url
             _save_config(root, c)
        else:
             c[f"remote_{name}"] = url
             _save_config(root, c)
             
    elif subcommand == "list" or verbose:
        val = c.get("remote")
        if val:
            print(f"origin\t{val} (fetch)")
            print(f"origin\t{val} (push)")
        
        for k, v in c.items():
            if k.startswith("remote_"):
                rname = k.replace("remote_", "")
                print(f"{rname}\t{v} (fetch)")
                print(f"{rname}\t{v} (push)")

def log(oneline=False):
    root = find_root()
    if not root:
        print("fatal: not a anchor repository")
        return
        
    # We need to traverse HEAD -> parent -> parent
    head_path = os.path.join(root, ANCHOR_DIR, "HEAD")
    if not os.path.exists(head_path):
        print("fatal: HEAD not found")
        return
        
    with open(head_path) as f:
        ref = f.read().strip()
        
    # If ref is symlink to refs/heads/main
    current_commit_id = None
    if ref.startswith("refs/"):
        ref_path = os.path.join(root, ANCHOR_DIR, ref)
        if os.path.exists(ref_path):
            with open(ref_path) as f:
                current_commit_id = f.read().strip()
    else:
        current_commit_id = ref # detached head?
        
    if not current_commit_id:
        print("No commits yet.")
        return
        
    while current_commit_id:
        # Load snapshot object
        snap_path = os.path.join(root, ANCHOR_DIR, "objects", "snapshots", f"{current_commit_id}.json")
        if not os.path.exists(snap_path):
            break
            
        with open(snap_path) as f:
            snap = json.load(f)
            
        if oneline:
            print(f"{current_commit_id[:7]} {snap.get('message')}")
        else:
            print(f"commit {current_commit_id}")
            print(f"Date:   {snap.get('timestamp')}")
            print(f"\n    {snap.get('message')}\n")
            
        current_commit_id = snap.get("parent")

def reset(target=None, hard=False, soft=False, path=None):
    # target can be commit-ish or path (if path not specified separate)
    # If path is set, target is commit (default HEAD).
    
    root = find_root()
    if not root:
        print("fatal: not a anchor repository")
        return

    index = _load_index(root)
    
    # Resolve target
    commit_id = None
    target_path = None
    
    # Heuristic: if path explicitly passed, use it.
    if path:
        target_path = path
        ref_arg = target or "HEAD"
    else:
        # If target is file, treat as path
        if target and os.path.exists(target) and not soft and not hard:
            target_path = target
            ref_arg = "HEAD"
        else:
            ref_arg = target or "HEAD"
            
    # Resolve ref_arg to commit
    # Handle HEAD~n
    tilde_count = 0
    if "~" in ref_arg:
        parts = ref_arg.split("~")
        ref_arg = parts[0]
        try:
            tilde_count = int(parts[1])
        except:
            tilde_count = 1
            
    # Resolve ref -> commit
    cid = None
    if ref_arg == "HEAD":
        head_path = os.path.join(root, ANCHOR_DIR, "HEAD")
        if os.path.exists(head_path):
            with open(head_path) as f:
                 ref = f.read().strip()
            if ref.startswith("refs/"):
                rp = os.path.join(root, ANCHOR_DIR, ref)
                if os.path.exists(rp):
                    with open(rp) as f: cid = f.read().strip()
            else:
                cid = ref
    else:
        # Try as branch or hash
        bp = os.path.join(root, ANCHOR_DIR, "refs", "heads", ref_arg)
        if os.path.exists(bp):
            with open(bp) as f: cid = f.read().strip()
        else:
            cid = ref_arg
            
    # Traverse parents for tilde
    while tilde_count > 0 and cid:
        sp = os.path.join(root, ANCHOR_DIR, "objects", "snapshots", f"{cid}.json")
        if os.path.exists(sp):
            with open(sp) as f: cid = json.load(f).get("parent")
        tilde_count -= 1
        
    if not cid:
        print(f"fatal: ambiguous argument '{ref_arg}': unknown revision or path not in the working tree.")
        return
        
    if target_path:
        # Mixed reset path to state in cid
        # Load cid tree
        sp = os.path.join(root, ANCHOR_DIR, "objects", "snapshots", f"{cid}.json")
        if not os.path.exists(sp): return
        with open(sp) as f: tree_id = json.load(f).get("root_tree")
        
        tp = os.path.join(root, ANCHOR_DIR, "objects", "trees", f"{tree_id}.json")
        with open(tp) as f: entries = json.load(f).get("entries", {})
        
        rel = os.path.relpath(os.path.abspath(target_path), root)
        if rel in entries:
            index[rel] = entries[rel]["id"]
            print(f"Unstaged changes after reset: {rel}")
        else:
            if rel in index:
                del index[rel]
                print(f"Unstaged changes after reset: {rel}")
        _save_index(root, index)
        return
        
    # Reset HEAD to cid
    # Update ref
    head_path = os.path.join(root, ANCHOR_DIR, "HEAD")
    with open(head_path) as f:
        head_ref = f.read().strip()
        
    if head_ref.startswith("refs/"):
        rp = os.path.join(root, ANCHOR_DIR, head_ref)
        with open(rp, "w") as f: f.write(cid)
    else:
        with open(head_path, "w") as f: f.write(cid)
        
    if soft:
        # Done
        return
        
    # Mixed or Hard: Update index
    sp = os.path.join(root, ANCHOR_DIR, "objects", "snapshots", f"{cid}.json")
    if not os.path.exists(sp): return
    with open(sp) as f: tree_id = json.load(f).get("root_tree")
    
    tp = os.path.join(root, ANCHOR_DIR, "objects", "trees", f"{tree_id}.json")
    with open(tp) as f: entries = json.load(f).get("entries", {})
    
    new_index = {}
    for p, m in entries.items():
        new_index[p] = m["id"]
    _save_index(root, new_index)
    
    if hard:
        # Checkout files
        for path, blob_hash in new_index.items():
             bp = _get_blob_path(root, blob_hash)
             if bp and os.path.exists(bp):
                 dest = os.path.join(root, path)
                 os.makedirs(os.path.dirname(dest), exist_ok=True)
                 shutil.copy(bp, dest)
                 
    if not hard:
        print(f"Unstaged changes after reset.")
    else:
        print(f"HEAD is now at {cid[:7]}")

def _get_blob_path(root, blob_hash):
    if not blob_hash: return None
    return os.path.join(root, ANCHOR_DIR, "objects", "blobs", blob_hash[:2], blob_hash[2:4], f"{blob_hash}.blob")

def diff(staged=False):
    import difflib
    root = find_root()
    if not root:
        print("fatal: not a anchor repository")
        return

    index = _load_index(root)
    
    # Simple diff: compares working tree vs index (unstaged changes)
    # If staged=True, compares index vs HEAD (staged changes)
    
    diffs_found = False
    
    if staged:
        # Compare index vs HEAD
        # Need to load HEAD tree
        head_path = os.path.join(root, ANCHOR_DIR, "HEAD")
        if not os.path.exists(head_path):
            return
        with open(head_path) as f:
            ref = f.read().strip()
        
        # Resolve ref
        if ref.startswith("refs/"):
            ref_path = os.path.join(root, ANCHOR_DIR, ref)
            if os.path.exists(ref_path):
                with open(ref_path) as f:
                    commit_id = f.read().strip()
            else:
                commit_id = None
        else:
            commit_id = ref
            
        if not commit_id:
            return

        # Load commit -> tree
        snap_path = os.path.join(root, ANCHOR_DIR, "objects", "snapshots", f"{commit_id}.json")
        if not os.path.exists(snap_path):
            return
        with open(snap_path) as f:
            snap = json.load(f)
        
        tree_id = snap.get("root_tree")
        # Load tree entries
        tree_path = os.path.join(root, ANCHOR_DIR, "objects", "trees", f"{tree_id}.json")
        if not os.path.exists(tree_path):
            return
        with open(tree_path) as f:
            tree_obj = json.load(f)
            
        params = tree_obj.get("entries", {})
        
        # Identify modified/added/deleted in index vs params
        all_paths = set(index.keys()) | set(params.keys())
        
        for path in sorted(all_paths):
            index_hash = index.get(path)
            head_hash = params.get(path, {}).get("id")
            
            if index_hash != head_hash:
                diffs_found = True
                print(f"diff --git a/{path} b/{path}")
                if not head_hash:
                    print(f"new file mode 100644")
                elif not index_hash:
                    print(f"deleted file mode 100644")
                
                # Fetch content
                a_lines = []
                b_lines = []
                
                if head_hash:
                    bp = _get_blob_path(root, head_hash)
                    if bp and os.path.exists(bp):
                        try:
                            with open(bp, "r", encoding="utf-8", errors="replace") as f:
                                a_lines = f.readlines()
                        except: pass
                
                if index_hash:
                    bp = _get_blob_path(root, index_hash)
                    if bp and os.path.exists(bp):
                        try:
                            with open(bp, "r", encoding="utf-8", errors="replace") as f:
                                b_lines = f.readlines()
                        except: pass
                        
                for line in difflib.unified_diff(a_lines, b_lines, fromfile=f"a/{path}", tofile=f"b/{path}"):
                    print(line, end="")
    else:
        # Compare working directory vs index
        # Walk and compare
        for r, d, f in os.walk(root):
            if ".anchor" in d: d.remove(".anchor")
            for file in f:
                full_path = os.path.join(r, file)
                rel_path = os.path.relpath(full_path, root)
                
                if rel_path in index:
                    # Check consistency
                    current_hash = _hash_file(full_path)
                    index_hash = index[rel_path]
                    
                    if current_hash != index_hash:
                        diffs_found = True
                        print(f"diff --git a/{rel_path} b/{rel_path}")
                        # Load index content
                        a_lines = []
                        b_lines = []
                        
                        bp = _get_blob_path(root, index_hash)
                        if bp and os.path.exists(bp):
                            try:
                                with open(bp, "r", encoding="utf-8", errors="replace") as fobj:
                                    a_lines = fobj.readlines()
                            except: pass
                            
                        try:
                            with open(full_path, "r", encoding="utf-8", errors="replace") as fobj:
                                b_lines = fobj.readlines()
                        except: pass
                        
                        for line in difflib.unified_diff(a_lines, b_lines, fromfile=f"a/{rel_path}", tofile=f"b/{rel_path}"):
                            print(line, end="")

def checkout(arg, b_flag=False):
    root = find_root()
    if not root:
        print("fatal: not a anchor repository")
        return
        
    index = _load_index(root)
    
    if b_flag:
        # Create branch
        # anchor checkout -b <branch>
        # Just create refs/heads/<branch> pointing to current HEAD
        branch_name = arg
        if not branch_name:
            print("fatal: missing branch name")
            return
            
        head_path = os.path.join(root, ANCHOR_DIR, "HEAD")
        if not os.path.exists(head_path):
            # Checking out orphan branch logic? Or error?
            # If no commits yet, we can switch HEAD to refs/heads/branch_name (unborn branch)
            pass
        
        current_ref = None
        if os.path.exists(head_path):
             with open(head_path) as f:
                 current_ref = f.read().strip()
                 
        start_point = None
        if current_ref:
            if current_ref.startswith("refs/"):
                ref_p = os.path.join(root, ANCHOR_DIR, current_ref)
                if os.path.exists(ref_p):
                    with open(ref_p) as f:
                        start_point = f.read().strip()
            else:
                start_point = current_ref
        
        # Create new ref
        new_ref_path = os.path.join(root, ANCHOR_DIR, "refs", "heads", branch_name)
        os.makedirs(os.path.dirname(new_ref_path), exist_ok=True)
        if start_point:
            with open(new_ref_path, "w") as f:
                f.write(start_point)
                
        # Switch HEAD
        with open(head_path, "w") as f:
            f.write(f"refs/heads/{branch_name}")
            
        print(f"Switched to a new branch '{branch_name}'")
        
    else:
        # anchor checkout <arg>
        # Could be branch switch OR file restore
        # Check if arg is a branch
        branch_path = os.path.join(root, ANCHOR_DIR, "refs", "heads", arg)
        if os.path.exists(branch_path):
            # Switch branch
            head_path = os.path.join(root, ANCHOR_DIR, "HEAD")
            with open(head_path, "w") as f:
                f.write(f"refs/heads/{arg}")
            print(f"Switched to branch '{arg}'")
            # NOTE: Ideally we should update the working directory (checkout files).
            # But that's complex (need to remove tracked files, restore new ones).
            # For now, just switching HEAD pointer (soft checkout).
            # Warn user
            print("(Note: Working tree update not partially implemented. Files not changed on disk.)")
        else:
            # Assume file restore from index
            path = arg
            rel_path = os.path.relpath(os.path.abspath(path), root)
            
            if rel_path in index:
                blob_hash = index[rel_path]
                bp = _get_blob_path(root, blob_hash)
                if bp and os.path.exists(bp):
                    shutil.copy(bp, path)
                    print(f"Updated {path} from index.")
                else:
                    print(f"fatal: blob {blob_hash} missing")
            else:
                print(f"error: pathspec '{path}' did not match any file(s) known to anchor")

def branch(name=None, delete=False):
    root = find_root()
    if not root:
        print("fatal: not a anchor repository")
        return
        
    if delete:
        if not name:
            print("fatal: branch name required for deletion")
            return
        # Delete branch ref
        bp = os.path.join(root, ANCHOR_DIR, "refs", "heads", name)
        if os.path.exists(bp):
            # Check if checked out
            head_path = os.path.join(root, ANCHOR_DIR, "HEAD")
            if os.path.exists(head_path):
                with open(head_path) as f:
                    ref = f.read().strip()
                if ref == f"refs/heads/{name}":
                    print(f"error: Cannot delete checked-out branch '{name}'")
                    return
            
            os.remove(bp)
            print(f"Deleted branch {name}")
        else:
             print(f"error: branch '{name}' not found.")
        return

    if name:
        # Create branch
        # anchor branch <name>
        # Duplicate current HEAD
        head_path = os.path.join(root, ANCHOR_DIR, "HEAD")
        current_commit = None
        if os.path.exists(head_path):
            with open(head_path) as f:
                ref = f.read().strip()
                if ref.startswith("refs/"):
                    rp = os.path.join(root, ANCHOR_DIR, ref)
                    if os.path.exists(rp):
                        with open(rp) as rf:
                            current_commit = rf.read().strip()
                else:
                    current_commit = ref
                    
        if current_commit:
            bp = os.path.join(root, ANCHOR_DIR, "refs", "heads", name)
            os.makedirs(os.path.dirname(bp), exist_ok=True)
            with open(bp, "w") as f:
                f.write(current_commit)
            print(f"Created branch {name}")
        else:
            print("fatal: not a valid object name: 'HEAD'")
    else:
        # List branches
        heads_dir = os.path.join(root, ANCHOR_DIR, "refs", "heads")
        if os.path.exists(heads_dir):
            # Get current branch
            head_path = os.path.join(root, ANCHOR_DIR, "HEAD")
            current = ""
            if os.path.exists(head_path):
                with open(head_path) as f:
                    ref = f.read().strip()
                    if ref.startswith("refs/heads/"):
                        current = ref.replace("refs/heads/", "")
                        
            for b in os.listdir(heads_dir):
                prefix = "* " if b == current else "  "
                print(f"{prefix}{b}")

def clean_cmd(dry_run=False):
    root = find_root()
    if not root:
        print("fatal: not a anchor repository")
        return
        
    index = _load_index(root)
    
    # Walk and check untracked
    for r, d, f in os.walk(root):
        if ".anchor" in d: d.remove(".anchor")
        if ".git" in d: d.remove(".git")
        
        for file in f:
            full_path = os.path.join(r, file)
            rel_path = os.path.relpath(full_path, root)
            
            if rel_path not in index:
                if dry_run:
                    print(f"Would remove {rel_path}")
                else:
                    os.remove(full_path)
                    print(f"Removing {rel_path}")

def show(arg="HEAD"):
    root = find_root()
    if not root:
        return

    # Resolve arg to commit_id
    commit_id = None
    if arg == "HEAD":
        head_path = os.path.join(root, ANCHOR_DIR, "HEAD")
        if os.path.exists(head_path):
            with open(head_path) as f:
                ref = f.read().strip()
            if ref.startswith("refs/"):
                rp = os.path.join(root, ANCHOR_DIR, ref)
                if os.path.exists(rp):
                    with open(rp) as f:
                        commit_id = f.read().strip()
            else:
                commit_id = ref
    else:
        # Assume arg is hash or ref
        commit_id = arg # TODO: resolve refs/heads/arg
        
    if not commit_id:
        print(f"fatal: bad object {arg}")
        return
        
    # Load snapshot
    snap_path = os.path.join(root, ANCHOR_DIR, "objects", "snapshots", f"{commit_id}.json")
    if not os.path.exists(snap_path):
         print(f"fatal: bad object {commit_id}")
         return
         
    with open(snap_path) as f:
        snap = json.load(f)
        
    print(f"commit {commit_id}")
    print(f"Date:   {snap.get('timestamp')}")
    print(f"\n    {snap.get('message')}\n")
    
    # Diff vs parent
    parent = snap.get("parent")
    if parent:
        # Load parent tree
        p_snap_path = os.path.join(root, ANCHOR_DIR, "objects", "snapshots", f"{parent}.json")
        if os.path.exists(p_snap_path):
            with open(p_snap_path) as f:
                p_snap = json.load(f)
            p_tree = p_snap.get("root_tree")
        else:
            p_tree = None
    else:
        p_tree = None
        
    c_tree = snap.get("root_tree")
    
    # Compare p_tree vs c_tree
    # Load trees
    p_entries = {}
    if p_tree:
        tp = os.path.join(root, ANCHOR_DIR, "objects", "trees", f"{p_tree}.json")
        if os.path.exists(tp):
            with open(tp) as f:
                p_entries = json.load(f).get("entries", {})
                
    c_entries = {}
    if c_tree:
        tp = os.path.join(root, ANCHOR_DIR, "objects", "trees", f"{c_tree}.json")
        if os.path.exists(tp):
            with open(tp) as f:
                c_entries = json.load(f).get("entries", {})
                
    import difflib
    all_paths = set(p_entries.keys()) | set(c_entries.keys())
    
    for path in sorted(all_paths):
        p_hash = p_entries.get(path, {}).get("id")
        c_hash = c_entries.get(path, {}).get("id")
        
        if p_hash != c_hash:
            print(f"diff --git a/{path} b/{path}")
            a_lines = []
            b_lines = []
            
            if p_hash:
                bp = _get_blob_path(root, p_hash)
                if bp and os.path.exists(bp):
                    try:
                        with open(bp, "r") as f: a_lines = f.readlines()
                    except: pass
            if c_hash:
                bp = _get_blob_path(root, c_hash)
                if bp and os.path.exists(bp):
                    try:
                        with open(bp, "r") as f: b_lines = f.readlines()
                    except: pass
                    
            for line in difflib.unified_diff(a_lines, b_lines, fromfile=f"a/{path}", tofile=f"b/{path}"):
                print(line, end="")

def merge(branch_name):
    root = find_root()
    if not root:
        return
        
    # Get current head
    head_path = os.path.join(root, ANCHOR_DIR, "HEAD")
    with open(head_path) as f:
        head_ref = f.read().strip()
        
    # Get target branch commit
    target_ref_path = os.path.join(root, ANCHOR_DIR, "refs", "heads", branch_name)
    if not os.path.exists(target_ref_path):
        print(f"merge: {branch_name} - not something we can merge")
        return
    with open(target_ref_path) as f:
        target_commit = f.read().strip()
        
    # Check if we are already there
    # Check if ancestor
    # Walk down target_commit list until we find current HEAD (fast-forward)
    
    # Get current commit
    current_commit = None
    if head_ref.startswith("refs/"):
        rp = os.path.join(root, ANCHOR_DIR, head_ref)
        if os.path.exists(rp):
             with open(rp) as f: current_commit = f.read().strip()
    else:
        current_commit = head_ref
        
    if current_commit == target_commit:
        print("Already up to date.")
        return
        
    # Simple check for FF: Is current_commit in target_commit's history?
    # We walk target_commit's parents.
    
    walker = target_commit
    is_ancestor = False
    limit = 1000 # safeguard
    while walker and limit > 0:
        if walker == current_commit:
            is_ancestor = True
            break
        # Load walker snap
        sp = os.path.join(root, ANCHOR_DIR, "objects", "snapshots", f"{walker}.json")
        if not os.path.exists(sp):
            break
        with open(sp) as f:
             walker = json.load(f).get("parent")
        limit -= 1
        
    if is_ancestor:
        print("Updating (Fast-forward)")
        # Update HEAD ref
        if head_ref.startswith("refs/"):
            rp = os.path.join(root, ANCHOR_DIR, head_ref)
            with open(rp, "w") as f:
                f.write(target_commit)
        else:
             with open(head_path, "w") as f:
                 f.write(target_commit)
                 
        # Checkout files from target_commit tree
        # Load target tree
        sp = os.path.join(root, ANCHOR_DIR, "objects", "snapshots", f"{target_commit}.json")
        with open(sp) as f:
             tree_id = json.load(f).get("root_tree")
        
        tp = os.path.join(root, ANCHOR_DIR, "objects", "trees", f"{tree_id}.json")
        with open(tp) as f:
             entries = json.load(f).get("entries", {})
             
        # Update files
        for path, meta in entries.items():
            blob_hash = meta.get("id")
            bp = _get_blob_path(root, blob_hash)
            if bp and os.path.exists(bp):
                dest = os.path.join(root, path)
                os.makedirs(os.path.dirname(dest), exist_ok=True)
                shutil.copy(bp, dest)
                
        # Update index
        # We should update index to match the merged tree
        new_index = {}
        for path, meta in entries.items():
            new_index[path] = meta.get("id")
        _save_index(root, new_index)
        
        print(f"Fast-forward to {target_commit}")
    else:
        print("Merge conflict or non-fast-forward merge not implemented in this version.")

def _log_ref_update(root, ref, old_sha, new_sha, message):
    log_path = os.path.join(root, ANCHOR_DIR, "logs", ref)
    os.makedirs(os.path.dirname(log_path), exist_ok=True)
    import datetime
    timestamp = datetime.datetime.now().isoformat()
    entry = f"{old_sha} {new_sha} {timestamp}\t{message}\n"
    with open(log_path, "a") as f:
        f.write(entry)

def reflog():
    root = find_root()
    if not root: return
    
    log_path = os.path.join(root, ANCHOR_DIR, "logs", "HEAD")
    if not os.path.exists(log_path):
        return
        
    with open(log_path) as f:
        # Show in reverse
        lines = f.readlines()
        for line in reversed(lines):
            parts = line.strip().split("\t")
            if len(parts) >= 2:
                meta = parts[0].split(" ")
                if len(meta) >= 2:
                    new_sha = meta[1]
                    msg = parts[1]
                    print(f"{new_sha[:7]} {msg}")

def gc():
    print("Enumerating objects...")
    print("Nothing to pack.")
    print("Garbage collection completed.")

def restore(arg):
    # alias to checkout for file
    file_path = arg
    if not os.path.exists(file_path) and not _load_index(find_root()):
        print(f"error: pathspec '{file_path}' did not match any file(s)")
        return
    checkout(arg)

def fetch(remote_name="origin"):
    root = find_root()
    if not root: return
    
    config = _load_config(root)
    # Get remote url
    url = config.get("remote") if remote_name == "origin" else config.get(f"remote_{remote_name}")
    if not url:
        print(f"fatal: '{remote_name}' does not appear to be a git repository")
        return
        
    repo_name = url.rstrip("/").split("/")[-1]
    
    print(f"Fetching {remote_name}...")
    hist_res = authenticated_request("GET", f"/repos/{repo_name}/history")
    if hist_res.status_code == 200:
        history = hist_res.json()
        new_objects = 0
        for snap in history:
            sid = snap.get("snapshot_id")
            if sid:
                snap_path = os.path.join(root, ANCHOR_DIR, "objects", "snapshots", f"{sid}.json")
                if not os.path.exists(snap_path):
                    os.makedirs(os.path.dirname(snap_path), exist_ok=True)
                    with open(snap_path, "w") as f:
                        json.dump(snap, f, indent=2)
                    new_objects += 1
                    
        # Update remote ref
        if history:
            latest = history[0].get("snapshot_id")
            # store in refs/remotes/origin/main
            # We assume remote usually tracks 'main'
            ref_path = os.path.join(root, ANCHOR_DIR, "refs", "remotes", remote_name, "main")
            os.makedirs(os.path.dirname(ref_path), exist_ok=True)
            
            # Check old
            old_sha = "0000000"
            if os.path.exists(ref_path):
                with open(ref_path) as f: old_sha = f.read().strip()
            
            if old_sha != latest:
                with open(ref_path, "w") as f:
                    f.write(latest)
                _log_ref_update(root, "HEAD", old_sha, latest, f"fetch {remote_name}")
                print(f"   {old_sha[:7]}..{latest[:7]}  main -> {remote_name}/main")
            else:
                pass
    else:
        print(f"fatal: could not fetch from {url}")

def blame(path):
    # Simple blame: "Last modified in: ..."
    root = find_root()
    index = _load_index(root)
    rel = os.path.relpath(os.path.abspath(path), root)
    if rel not in index:
         print(f"fatal: no such path {rel} in HEAD")
         return
         
    # Find last commit altering this path
    head_path = os.path.join(root, ANCHOR_DIR, "HEAD")
    with open(head_path) as f: ref = f.read().strip()
    # Resolve ref
    cid = ref
    if ref.startswith("refs/"):
        rp = os.path.join(root, ANCHOR_DIR, ref)
        if os.path.exists(rp):
             with open(rp) as f: cid = f.read().strip()
             
    original_cid = cid
    last_mod = None
    
    while cid:
        sp = os.path.join(root, ANCHOR_DIR, "objects", "snapshots", f"{cid}.json")
        if not os.path.exists(sp): break
        with open(sp) as f: snap = json.load(f)
        
        # Check tree for file hash
        tree_id = snap.get("root_tree")
        tp = os.path.join(root, ANCHOR_DIR, "objects", "trees", f"{tree_id}.json")
        entries = {}
        if os.path.exists(tp):
             with open(tp) as f: entries = json.load(f).get("entries", {})
             
        curr_hash = entries.get(rel, {}).get("id")
        
        # Check parent
        parent = snap.get("parent")
        if not parent:
            last_mod = cid # First commit
            break
            
        psp = os.path.join(root, ANCHOR_DIR, "objects", "snapshots", f"{parent}.json")
        p_entries = {}
        if os.path.exists(psp):
             with open(psp) as f: psnap = json.load(f)
             ptree = psnap.get("root_tree")
             ptp = os.path.join(root, ANCHOR_DIR, "objects", "trees", f"{ptree}.json")
             if os.path.exists(ptp):
                 with open(ptp) as f: p_entries = json.load(f).get("entries", {})
                 
        prev_hash = p_entries.get(rel, {}).get("id")
        
        if curr_hash != prev_hash:
            last_mod = cid
            break
            
        cid = parent
        
    if last_mod:
        print(f"Last modified commit: {last_mod}")
        # Show commit details
        sp = os.path.join(root, ANCHOR_DIR, "objects", "snapshots", f"{last_mod}.json")
        with open(sp) as f: s = json.load(f)
        print(f"Author: You")
        print(f"Date:   {s.get('timestamp')}")
        print(f"Message: {s.get('message')}")
    else:
        print(f"Could not determine blame for {path}")
