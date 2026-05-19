
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import uuid
import os

from app.database import get_db
from app import models, crud # [MODIFIED] Added crud

router = APIRouter(tags=["browser_profiles"])

# === Schemas ===
class BrowserProfileCreate(BaseModel):
    name: str
    user_agent: Optional[str] = None
    tags: Optional[List[str]] = [] # [NEW]

class BrowserProfileResponse(BaseModel):
    id: str
    name: str
    user_data_dir: str
    created_at: datetime
    tags: List[str] = [] # [NEW]
    daily_gen_count: int = 0
    last_gen_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# === Endpoints ===

@router.get("/", response_model=List[BrowserProfileResponse])
def get_browser_profiles(db: Session = Depends(get_db)):
    """List all browser profiles"""
    profiles = db.query(models.BrowserProfile).all()
    results = []
    for p in profiles:
        resp = BrowserProfileResponse.from_orm(p)
        resp.tiktok_count = len(p.tiktok_channels)
        resp.insta_count = len(p.instagram_channels)
        resp.notebooklm_count = len(p.notebooklm_accounts)
        results.append(resp)
    return results

@router.post("/", response_model=BrowserProfileResponse)
def create_browser_profile(
    profile_in: BrowserProfileCreate, 
    db: Session = Depends(get_db)
):
    """Create a new browser profile"""
    # Generate ID
    profile_id = str(uuid.uuid4())
    
    # [MODIFIED] Use root_download_path from settings instead of hardcoded 'userdata/profiles'
    settings = crud.get_settings(db)
    base_user_data = os.path.join(settings.root_download_path, "04_Profiles")
    os.makedirs(base_user_data, exist_ok=True)
    
    user_data_dir = os.path.join(base_user_data, profile_id)
    
    profile = models.BrowserProfile(
        id=profile_id,
        name=profile_in.name,
        user_data_dir=user_data_dir,
        user_agent=profile_in.user_agent,
        tags=profile_in.tags or [] # [NEW]
    )
    
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile

# [NEW] Patch Endpoint
class BrowserProfileUpdate(BaseModel):
    name: Optional[str] = None
    tags: Optional[List[str]] = None
    
@router.patch("/{profile_id}", response_model=BrowserProfileResponse)
def update_browser_profile(
    profile_id: str,
    update_in: BrowserProfileUpdate,
    db: Session = Depends(get_db)
):
    profile = db.query(models.BrowserProfile).filter(models.BrowserProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(404, "Profile not found")
        
    if update_in.name is not None:
        profile.name = update_in.name
    if update_in.tags is not None:
        profile.tags = update_in.tags
    
    db.commit()
    db.refresh(profile)
    return profile

@router.post("/{profile_id}/launch")
def launch_browser_profile(profile_id: str, db: Session = Depends(get_db)):
    """
    Launch the browser profile for manual login/management.
    """
    profile = db.query(models.BrowserProfile).filter(models.BrowserProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(404, "Profile not found")
    
    # Check if directory exists
    if not os.path.exists(profile.user_data_dir):
        os.makedirs(profile.user_data_dir, exist_ok=True)
        
    try:
        # We use a simple subprocess to launch Chrome with this user data dir
        # Assuming Chrome is in path or we find it. 
        # Alternatively, use DrissionPage to launch it.
        # DrissionPage is preferred as it handles finding chrome.
        
        from DrissionPage import ChromiumOptions, Chromium
        
        # We need to launch it in a way that doesn't block the API? 
        # Or just launch and return success?
        # Chromium() initialization blocks? No, it connects.
        
        # Simple approach: Launch using os.system/subprocess for now to just "open" it.
        # But DrissionPage is used elsewhere.
        
        # Let's try to find Chrome path logic used in other parts of app?
        # For now, let's just attempt a robust launch.
        
        import subprocess
        import platform
        
        # Common Chrome/Chromium Paths
        if platform.system() == "Windows":
            chrome_paths = [
                r"C:\Program Files\Google\Chrome\Application\chrome.exe",
                r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
                r"C:\Users\%USERNAME%\AppData\Local\Google\Chrome\Application\chrome.exe"
            ]
        else:
            # Linux Paths
            chrome_paths = [
                "/usr/bin/google-chrome",
                "/usr/bin/chromium",
                "/usr/bin/chromium-browser",
                "/snap/bin/chromium"
            ]
        
        chrome_exe = None
        for path in chrome_paths:
            expanded = os.path.expandvars(path)
            if os.path.exists(expanded):
                chrome_exe = expanded
                break
                
        if not chrome_exe:
             # Try getting from DrissionPage default
             try:
                 from DrissionPage.easy_set import _get_chrome_path
                 chrome_exe = _get_chrome_path({})
             except:
                 pass
                 
        if not chrome_exe:
            raise HTTPException(500, "Chrome executable not found")

        # Command
        # --no-first-run --no-default-browser-check
        cmd = [
            chrome_exe,
            f"--user-data-dir={profile.user_data_dir}",
            "--no-first-run",
            "--no-sandbox", # [NEW] Required for many Linux/Docker envs
            "--disable-dev-shm-usage", # [NEW] Prevents crashes in Docker
            "--no-default-browser-check",
            "https://www.tiktok.com/login" # Open convenient pages
        ]
        
        # Open detached
        if platform.system() == "Windows":
            subprocess.Popen(cmd, close_fds=True, creationflags=subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP)
        else:
            # Linux Detach
            subprocess.Popen(cmd, close_fds=True, start_new_session=True)
        
        return {"message": "Browser launched", "profile": profile.name}
        
    except Exception as e:
        print(f"Failed to launch browser: {e}")
        raise HTTPException(500, f"Launch failed: {str(e)}")

@router.delete("/{profile_id}")
def delete_browser_profile(profile_id: str, db: Session = Depends(get_db)):
    """Delete a browser profile"""
    profile = db.query(models.BrowserProfile).filter(models.BrowserProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(404, "Profile not found")
    
    # Optional: Cleanup directory? 
    # For safety, we might keep the folder or move it to trash, but strict deletion is requested?
    # Keeping it simple: Database delete only for now to avoid data loss accidents.
    
    db.delete(profile)
    db.commit()
    return {"message": "Profile deleted", "id": profile_id}
