
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import uuid
import os
import sys
import glob
import subprocess
import psutil
import logging

from app.database import get_db
from app import models, crud # [MODIFIED] Added crud

logger = logging.getLogger("BrowserProfiles")

router = APIRouter(tags=["browser_profiles"])

# === Schemas ===
class BrowserProfileCreate(BaseModel):
    name: str
    user_agent: Optional[str] = None
    tags: Optional[List[str]] = [] # [NEW]
    parent_brand_id: Optional[str] = None # [NEW] Folder-based Brand UI Integration

class BrowserProfileResponse(BaseModel):
    id: str
    name: str
    user_data_dir: str
    created_at: datetime
    tags: Optional[List[str]] = [] # [NEW]
    parent_brand_id: Optional[str] = None # [NEW] Folder-based Brand UI Integration
    daily_gen_count: int = 0
    last_gen_at: Optional[datetime] = None
    tiktok_count: int = 0
    insta_count: int = 0
    notebooklm_count: int = 0
    douyin_count: int = 0
    
    class Config:
        from_attributes = True

def _to_profile_response(p: models.BrowserProfile) -> BrowserProfileResponse:
    return BrowserProfileResponse(
        id=p.id,
        name=p.name or "",
        user_data_dir=p.user_data_dir or "",
        created_at=p.created_at or datetime.now(),
        tags=p.tags or [],
        parent_brand_id=p.parent_brand_id,
        daily_gen_count=p.daily_gen_count or 0,
        last_gen_at=getattr(p, 'last_gen_at', None),
        tiktok_count=len(getattr(p, 'tiktok_channels', []) or []),
        insta_count=len(getattr(p, 'instagram_channels', []) or []),
        notebooklm_count=len(getattr(p, 'notebooklm_accounts', []) or []),
        douyin_count=len(getattr(p, 'douyin_channels', []) or []),
    )

# === Endpoints ===

@router.get("/", response_model=List[BrowserProfileResponse])
@router.get("", response_model=List[BrowserProfileResponse])
def get_browser_profiles(parent_brand_id: Optional[str] = None, db: Session = Depends(get_db)):
    """List all browser profiles"""
    query = db.query(models.BrowserProfile)
    if parent_brand_id:
        query = query.filter(models.BrowserProfile.parent_brand_id == parent_brand_id)
    profiles = query.all()
    return [_to_profile_response(p) for p in profiles]

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
    from app.config import settings as settings_conf
    root_path = settings.root_download_path if settings and settings.root_download_path else settings_conf.MEDIA_ROOT
    base_user_data = os.path.join(root_path, "04_Profiles")
    os.makedirs(base_user_data, exist_ok=True)
    
    user_data_dir = os.path.join(base_user_data, profile_id)
    
    profile = models.BrowserProfile(
        id=profile_id,
        name=profile_in.name,
        user_data_dir=user_data_dir,
        user_agent=profile_in.user_agent,
        parent_brand_id=profile_in.parent_brand_id
    )
    
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return _to_profile_response(profile)

class SyncYouTubeRequest(BaseModel):
    youtube_channel_id: str

@router.post("/sync-youtube", response_model=BrowserProfileResponse)
def sync_youtube_channel_as_profile(
    req: SyncYouTubeRequest,
    db: Session = Depends(get_db)
):
    """Sync a YouTube Channel to act as a Browser Profile for TikTok/Insta"""
    yt_channel = db.query(models.YouTubeChannel).filter(models.YouTubeChannel.channel_id == req.youtube_channel_id).first()
    if not yt_channel:
        raise HTTPException(404, "YouTube Channel not found")
        
    profile = db.query(models.BrowserProfile).filter(models.BrowserProfile.id == yt_channel.channel_id).first()
    if profile:
        return _to_profile_response(profile) # Already exists
        
    settings = crud.get_settings(db)
    from app.config import settings as settings_conf
    root_path = settings.root_download_path if settings and settings.root_download_path else settings_conf.MEDIA_ROOT
    base_user_data = os.path.join(root_path, "04_Profiles")
    os.makedirs(base_user_data, exist_ok=True)
    
    channel_title = getattr(yt_channel, 'channel_name', None) or getattr(yt_channel, 'title', None) or '브랜드 채널'
    parent_brand_id = getattr(yt_channel, 'owner_profile_id', None)
    owner_profile = db.query(models.Profile).filter(models.Profile.id == parent_brand_id).first() if parent_brand_id else None
    if owner_profile and owner_profile.folder_path:
        user_data_dir = owner_profile.folder_path
    elif parent_brand_id:
        user_data_dir = os.path.join(base_user_data, parent_brand_id)
    else:
        user_data_dir = os.path.join(base_user_data, yt_channel.channel_id)
    
    profile = models.BrowserProfile(
        id=yt_channel.channel_id,
        name=f"{channel_title} (YouTube 연동)",
        user_data_dir=user_data_dir,
        user_agent=None,
        parent_brand_id=parent_brand_id
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return _to_profile_response(profile)

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
    
    db.commit()
    db.refresh(profile)
    return _to_profile_response(profile)

@router.post("/{profile_id}/launch")
def launch_browser_profile(
    profile_id: str, 
    platform: Optional[str] = Query(None, description="tiktok, instagram, douyin, youtube, or all"),
    url: Optional[str] = Query(None, description="Custom target URL to open"),
    db: Session = Depends(get_db)
):
    """
    Launch the browser profile for manual login/management.
    Cleans up any zombie processes locking the profile folder, detects CloakBrowser/Chrome/Edge,
    and opens a visible interactive window on the user's desktop.
    """
    profile = db.query(models.BrowserProfile).filter(models.BrowserProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(404, "Profile not found")
    
    # 1. Check directory exists
    if not os.path.exists(profile.user_data_dir):
        os.makedirs(profile.user_data_dir, exist_ok=True)
        
    try:
        # 2. Clean up lingering zombie processes locking this profile directory
        if sys.platform == "win32" and profile.user_data_dir:
            try:
                norm_dir = os.path.normpath(profile.user_data_dir).lower()
                for p in psutil.process_iter(['pid', 'name', 'cmdline']):
                    try:
                        cmdline = p.info.get('cmdline') or []
                        for arg in cmdline:
                            if norm_dir in arg.lower():
                                p.kill()
                                break
                    except Exception:
                        pass
            except Exception as clean_err:
                print(f"Warning: Process cleanup error: {clean_err}")

        # 3. Determine target URLs (크리에이터 스튜디오 / 관리 페이지 직결)
        target_urls = []
        if url:
            target_urls = [url]
        elif platform == 'tiktok':
            target_urls = ["https://www.tiktok.com/creator-center"]
        elif platform == 'instagram':
            target_urls = ["https://www.instagram.com/"]
        elif platform == 'douyin':
            target_urls = ["https://www.douyin.com/"]
        elif platform == 'youtube':
            target_urls = ["https://studio.youtube.com/"]
        else:
            # Default: 유튜브 연동 프로필이면 YouTube Studio 포함, 아니면 틱톡 + 인스타그램 동시 오픈
            if profile.id.startswith('UC') or 'YouTube' in (profile.name or ''):
                target_urls = ["https://studio.youtube.com/", "https://www.tiktok.com/creator-center", "https://www.instagram.com/"]
            else:
                target_urls = ["https://www.tiktok.com/creator-center", "https://www.instagram.com/"]

        # 4. Profile Directory and Proxy lookup from linked Google/YouTube profile if available
        proxy_str = "0"
        parent_profile = None
        try:
            from app.models import Profile
            if profile.parent_brand_id:
                parent_profile = db.query(Profile).filter(Profile.id == profile.parent_brand_id).first()
            if not parent_profile and profile.id:
                parent_profile = db.query(Profile).filter((Profile.id == profile.id) | (Profile.channel_id == profile.id)).first()
            
            if parent_profile:
                if parent_profile.proxy_mode == "ISP_PROXY" and parent_profile.proxy_host:
                    p_port = parent_profile.proxy_port or 1080
                    protocol = getattr(parent_profile, "proxy_protocol", "http") or "http"
                    if parent_profile.proxy_username and parent_profile.proxy_password:
                        proxy_str = f"{protocol}://{parent_profile.proxy_username}:{parent_profile.proxy_password}@{parent_profile.proxy_host}:{p_port}"
                    else:
                        proxy_str = f"{protocol}://{parent_profile.proxy_host}:{p_port}"
                elif parent_profile.proxy_mode == "DIRECT_LTE":
                    from app.services.adb_service import adb_service
                    target_serial = getattr(parent_profile, "bound_device_serial", None)
                    port = getattr(parent_profile, "proxy_port", None) or adb_service.get_device_port(target_serial)
                    adb_service.ensure_every_proxy_socks_active(target_serial)
                    proxy_str = str(port)
        except Exception as proxy_err:
            logger.warning(f"Proxy lookup failed, fallback to direct: {proxy_err}")

        # Choose profile directory: linked Google profile folder if available, else user_data_dir
        profile_dir = profile.user_data_dir
        if parent_profile and parent_profile.folder_path and os.path.exists(parent_profile.folder_path):
            profile_dir = parent_profile.folder_path
        os.makedirs(profile_dir, exist_ok=True)

        # 2. Clean up lingering zombie processes locking this profile directory
        if sys.platform == "win32" and profile_dir:
            try:
                clean_dir = profile_dir.lower().replace('\\', '/')
                profile_base = os.path.basename(profile_dir).lower()
                for p in psutil.process_iter(['pid', 'name', 'cmdline']):
                    try:
                        cmdline = ' '.join(p.info.get('cmdline') or []).lower().replace('\\', '/')
                        if (clean_dir in cmdline or profile_base in cmdline) and p.pid != os.getpid():
                            p.kill()
                    except Exception:
                        pass
            except Exception as clean_err:
                print(f"Warning: Process cleanup error: {clean_err}")

        # 5. Launch Stealth CloakBrowser (구글 계정관리의 보안접속과 100% 동일한 local_browser.py 엔진)
        from app.utils.python_env import get_venv_python
        script_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "services", "local_browser.py"))
        venv_python = get_venv_python()

        # Comma-separated target URLs for multi-tab opening
        url_arg = ",".join(target_urls)
        cmd = [venv_python, script_path, profile_dir, url_arg, proxy_str]
        if parent_profile and parent_profile.email and parent_profile.password:
            cmd.extend([parent_profile.email, parent_profile.password])

        logger.info(f"🛡️ [스텔스 보안접속] Launching CloakBrowser for {profile.name}: {cmd}")

        # 0x08000000 (CREATE_NO_WINDOW): Suppress black cmd console completely
        creation_flags = 0x08000000 if sys.platform == "win32" else 0
        subprocess.Popen(
            cmd,
            creationflags=creation_flags
        )

        return {
            "status": "launched",
            "message": f"🛡️ CloakBrowser 스텔스 보안 브라우저가 실행되었습니다.",
            "profile": profile.name,
            "browser": "CloakBrowser (스텔스 안티디텍트)",
            "urls": target_urls
        }
        
    except Exception as e:
        print(f"Failed to launch browser: {e}")
        raise HTTPException(500, f"Launch failed: {str(e)}")

@router.delete("/{profile_id}")
def delete_browser_profile(
    profile_id: str, 
    delete_disk_folder: bool = True,
    db: Session = Depends(get_db)
):
    """Delete a browser profile and optionally cleanup its user data directory"""
    profile = db.query(models.BrowserProfile).filter(models.BrowserProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(404, "Profile not found")
    
    user_data_dir = profile.user_data_dir
    
    db.delete(profile)
    db.commit()
    
    folder_cleaned = False
    if delete_disk_folder and user_data_dir and os.path.exists(user_data_dir):
        try:
            import shutil
            # Safe guard: Only delete inside 04_Profiles to avoid accidental system path deletion
            norm_path = os.path.abspath(user_data_dir)
            if "04_Profiles" in norm_path:
                shutil.rmtree(norm_path, ignore_errors=True)
                folder_cleaned = True
        except Exception as e:
            print(f"Failed to cleanup profile directory {user_data_dir}: {e}")
            
    return {"message": "Profile deleted", "id": profile_id, "folder_cleaned": folder_cleaned}
