import os
import json
import tempfile
import shutil
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Response, Query, UploadFile, File, Form
from typing import List
from models import RepoCreate, SnapshotCreate
from svcs import init_repo, save_snapshot, get_history, get_diff, unzip_and_save_snapshot
from dependencies import get_current_user, check_repo_access, require_step_up
from authorization import require_permission, Permission
from config_manager import get_config_manager

config = get_config_manager()
router = APIRouter(prefix="/repos", tags=["repos"])

@router.post("/{name}/upload", response_model=dict)
async def upload_repo_snapshot(
    name: str = Depends(check_repo_access), 
    message: str = Form(...), 
    file: UploadFile = File(...), 
    user: dict = Depends(get_current_user)
):
    """Accept a zip file, unzip it, and save a snapshot."""
    # Check write permission
    require_permission(user, Permission.WRITE_REPO, {"type": "repo", "id": name})
    
    suffix = os.path.splitext(file.filename)[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name
        
    try:
        snapshot_id = unzip_and_save_snapshot(name, message, tmp_path)
        return {"snapshot_id": snapshot_id}
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

@router.get("/{name}/history", response_model=List[dict])
async def get_repo_history(name: str = Depends(check_repo_access)):
    """Return the snapshot history for a repo."""
    return get_history(name)

@router.get("/{name}/diff", response_model=dict)
async def get_repo_diff(
    name: str = Depends(check_repo_access), 
    from_id: str = Query(..., alias="from"), 
    to_id: str = Query(..., alias="to")
):
    """Return the diff between two snapshots."""
    return get_diff(name, from_id, to_id)

@router.get("/{name}/stats", response_model=dict)
async def get_repo_stats(name: str = Depends(check_repo_access)):
    """Return statistics for a repository."""
    repo_root = config.get("SVCS_ROOT", "/svcs-data")
    repo_path = os.path.join(repo_root, name)
    
    snapshots_dir = os.path.join(repo_path, "objects", "snapshots")
    snapshot_count = len([f for f in os.listdir(snapshots_dir) if f.endswith(".json")]) if os.path.exists(snapshots_dir) else 0
    
    file_count = 0
    ref_path = os.path.join(repo_path, "refs", "main")
    if os.path.exists(ref_path):
        with open(ref_path) as f:
            latest_id = f.read().strip()
        if latest_id:
            snapshot_path = os.path.join(repo_path, "objects", "snapshots", f"{latest_id}.json")
            with open(snapshot_path) as f:
                snap = json.load(f)
            tree_path = os.path.join(repo_path, "objects", "trees", f"{snap['root_tree']}.json")
            with open(tree_path) as f:
                tree = json.load(f)
                file_count = len(tree.get("entries", {}))
                
    return {
        "snapshot_count": snapshot_count,
        "file_count": file_count
    }

@router.post("/", response_model=dict)
async def create_repo(payload: RepoCreate, user: dict = Depends(require_step_up)):
    """Create a new repository (requires step-up auth)"""
    # Check create permission
    require_permission(user, Permission.CREATE_REPO)
    
    repo_path = init_repo(payload.name)
    return {"msg": f"Repository '{payload.name}' created", "path": repo_path}

@router.get("/", response_model=List[dict])
async def list_repositories(user: dict = Depends(get_current_user)):
    base = config.get("SVCS_ROOT", "/svcs-data")
    repos = []
    for d in os.listdir(base):
        repo_path = os.path.join(base, d)
        if os.path.isdir(repo_path):
            meta_path = os.path.join(repo_path, "meta.json")
            if os.path.exists(meta_path):
                with open(meta_path) as f:
                    meta = json.load(f)
                    # Ensure is_favorite exists
                    if "is_favorite" not in meta:
                        meta["is_favorite"] = False
                    repos.append(meta)
            else:
                repos.append({"name": d, "is_public": False, "is_favorite": False})
    return repos

@router.get("/{name}", response_model=dict)
async def get_repo_metadata(name: str = Depends(check_repo_access)):
    meta_path = os.path.join(config.get("SVCS_ROOT", "/svcs-data"), name, "meta.json")
    if not os.path.exists(meta_path):
        raise HTTPException(status_code=404, detail="Repo not found")
    with open(meta_path) as f:
        return json.load(f)

@router.post("/{name}/save", response_model=dict)
async def save_repo_snapshot(name: str = Depends(check_repo_access), payload: SnapshotCreate = None, user: dict = Depends(get_current_user)):
    """Save a new snapshot"""
    # Check write permission
    require_permission(user, Permission.WRITE_REPO, {"type": "repo", "id": name})
    
    work_dir = tempfile.mkdtemp(prefix=f"anchor_{name}_")
    try:
        snapshot_id = save_snapshot(name, payload.message, work_dir)
        return {"snapshot_id": snapshot_id}
    finally:
        shutil.rmtree(work_dir)

@router.get("/{name}/tree/{snapshot_id}", response_model=dict)
async def get_tree(snapshot_id: str, name: str = Depends(check_repo_access)):
    """Return the tree JSON for a given snapshot."""
    repo_root = config.get("SVCS_ROOT", "/svcs-data")
    snapshot_path = os.path.join(repo_root, name, "objects", "snapshots", f"{snapshot_id}.json")
    if not os.path.exists(snapshot_path):
        raise HTTPException(status_code=404, detail="Snapshot not found")
    with open(snapshot_path) as f:
        snapshot = json.load(f)
    
    tree_id = snapshot["root_tree"]
    tree_path = os.path.join(repo_root, name, "objects", "trees", f"{tree_id}.json")
    if not os.path.exists(tree_path):
        raise HTTPException(status_code=404, detail="Tree not found")
    with open(tree_path) as f:
        return json.load(f)

@router.get("/{name}/file/{snapshot_id}/{file_path:path}")
async def get_file(snapshot_id: str, file_path: str, name: str = Depends(check_repo_access)):
    """Return raw file content for a given path in a snapshot."""
    repo_root = config.get("SVCS_ROOT", "/svcs-data")
    snapshot_path = os.path.join(repo_root, name, "objects", "snapshots", f"{snapshot_id}.json")
    if not os.path.exists(snapshot_path):
        raise HTTPException(status_code=404, detail="Snapshot not found")
    with open(snapshot_path) as f:
        snapshot = json.load(f)
    
    tree_id = snapshot["root_tree"]
    tree_path = os.path.join(repo_root, name, "objects", "trees", f"{tree_id}.json")
    if not os.path.exists(tree_path):
        raise HTTPException(status_code=404, detail="Tree not found")
    with open(tree_path) as tf:
        tree = json.load(tf)
    
    blob_info = tree.get("entries", {}).get(file_path)
    if not blob_info:
        raise HTTPException(status_code=404, detail="File not found in snapshot")
    
    blob_id = blob_info['id']
    blob_path = os.path.join(repo_root, name, "objects", "blobs", blob_id[:2], blob_id[2:4], f"{blob_id}.blob")
    if not os.path.exists(blob_path):
        raise HTTPException(status_code=404, detail="Blob not found")
    with open(blob_path, "rb") as bf:
        content = bf.read()
    return Response(content, media_type="application/octet-stream")

@router.get("/{name}/archive", response_class=Response)
async def download_archive(name: str = Depends(check_repo_access), ref: str = "main"):
    """Download repository as zip archive"""
    repo_root = config.get("SVCS_ROOT", "/svcs-data")
    repo_path = os.path.join(repo_root, name)
    
    # Get snapshot ID from ref
    if ref == "main":
        ref_path = os.path.join(repo_path, "refs", "main")
        if not os.path.exists(ref_path):
             raise HTTPException(status_code=404, detail="Ref not found")
        with open(ref_path) as f:
            snapshot_id = f.read().strip()
    else:
        snapshot_id = ref # Assume snapshot ID passed directly
        
    if not snapshot_id:
        raise HTTPException(status_code=404, detail="Repo is empty")
        
    from svcs import create_archive
    
    try:
        zip_path = create_archive(name, snapshot_id)
        
        with open(zip_path, "rb") as f:
            content = f.read()
            
        # Cleanup
        os.remove(zip_path)
        
        return Response(
            content=content,
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename={name}-{snapshot_id}.zip"}
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail="Archive creation failed")




@router.patch("/{name}/favorite", response_model=dict)
async def toggle_repository_favorite(
    name: str = Depends(check_repo_access),
    is_favorite: bool = False,
    user: dict = Depends(get_current_user)
):
    """Toggle repository favorite status."""
    meta_path = os.path.join(config.get("SVCS_ROOT", "/svcs-data"), name, "meta.json")
    if not os.path.exists(meta_path):
        raise HTTPException(status_code=404, detail="Repository not found")
    
    with open(meta_path, "r") as f:
        meta = json.load(f)
    
    meta["is_favorite"] = is_favorite
    
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)
    
    return {
        "repository": name,
        "is_favorite": is_favorite,
        "message": f"Repository {'marked as favorite' if is_favorite else 'removed from favorites'}"
    }


