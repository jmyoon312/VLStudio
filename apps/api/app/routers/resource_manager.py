from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Body, BackgroundTasks, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
import json
import socket
import shutil
import os
import stat
import uuid
import enum # For Enums if needed, verifying
from app.models import ProfileStatus, Profile, ProfileType
from app.database import get_db
from app import models, schemas, crud
from app.services.credential_manager import CredentialManager
from app.services.adb_service import adb_service
from app.services.stealth_ops_v2 import stealth_ops
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# --- DEPRECATED: TinCanAccount & CaptainAccount (Migrated to Profile) ---
# See models.py: Profile model replaces these. 
# Endpoints below are kept commented out for reference or future cleanup.

# --- Profile Lifecycle (Wizard) ---
from app.models import Profile, ProfileStatus, ProfileType, BrandChannel
import os
import json

import time
import requests
from datetime import datetime, timedelta
import requests

# Automation imports
from app.services.automation.orchestrator import AutomationOrchestrator, AutomationConfig

# Pydantic models for request bodies
class LaunchSetupRequest(BaseModel):
    rotate_ip: bool = False
    skip_browser: bool = False
    target_channel_id: Optional[str] = None


# [Access Control Guard]
def verify_active_profile(profile: Profile):
    """ Enforce Quarantine Lock """
    if profile.status == ProfileStatus.QUARANTINED:
        release_date = "Unknown"
        if profile.quarantine_start_date:
            release_date = (profile.quarantine_start_date + timedelta(days=90)).strftime("%Y-%m-%d")
        
        detail_msg = f"寃⑸━ 議곗튂??怨꾩젙?낅땲?? (?댁젣 ?덉젙?? {release_date}) - ?ъ쑀: {profile.quarantine_reason}"
        raise HTTPException(status_code=403, detail=detail_msg)


@router.post("/profiles/draft")
def create_draft_profile(type: str = Query("TIN_CAN"), payload: dict = Body(...), db: Session = Depends(get_db)):
    """ 1. Wizard Start: Generate ID with optional Email pre-check """
    
    # [Pre-check] Email Duplication
    email = payload.get("email")
    password = payload.get("password")
    recovery_email = payload.get("recovery_email")
    engine_type = payload.get("engine_type", "cloakbrowser")
    
    if email:
        existing = db.query(Profile).filter(Profile.email == email).first()
        if existing:
            raise HTTPException(status_code=409, detail="이미 등록된 이메일입니다.")

    try:
        import uuid
        new_id = str(uuid.uuid4())
        
        # Get profile base path from settings
        from app.config import settings
        from pathlib import Path
        
        media_root = getattr(settings, "MEDIA_ROOT", None)
        if not media_root:
            # Fallback if MEDIA_ROOT is not set
            media_root = "C:/ViraLoopData"
            
        base_profiles_path = Path(media_root) / "04_Profiles"
        
        # Ensure base directory exists
        os.makedirs(base_profiles_path, exist_ok=True)
        
        # Combine base path with specific profile ID
        folder_path = os.path.join(str(base_profiles_path), new_id).replace("\\", "/")
        
        # Ensure directory exists immediately
        os.makedirs(folder_path, exist_ok=True)
        
        new_profile = Profile(
            id=new_id,
            email=email,
            password=password,
            recovery_email=recovery_email,
            engine_type=engine_type,
            status=ProfileStatus.DRAFT,
            folder_path=folder_path,
            profile_type=type
        )
        db.add(new_profile)
        db.commit()
        return {"id": new_id, "status": "DRAFT"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/profiles/{id}/confirm")
def confirm_creation(id: str, email: str, recovery: str = None, db: Session = Depends(get_db)):
    """ 3. Wizard Finish (Legacy/Manual) """
    # ... Same as before ...
    profile = db.query(Profile).filter(Profile.id == id).first()
    if not profile: raise HTTPException(404, "Profile not found")
    
    if email:
        existing = db.query(Profile).filter(Profile.email == email, Profile.id != id).first()
        if existing:
            raise HTTPException(status_code=409, detail="?대? ?깅줉???대찓?쇱엯?덈떎.")
    # ...
    profile.email = email
    profile.recovery_email = recovery
    profile.status = ProfileStatus.ACTIVE 
    db.commit()
    return {"status": "confirmed", "profile": profile.id}

@router.put("/profiles/{id}")
def update_profile(id: str, item: dict = Body(...), db: Session = Depends(get_db)):
    # ... Same as before ...
    profile = db.query(Profile).filter(Profile.id == id).first()
    if not profile: raise HTTPException(404, "Profile not found")
    
    new_email = item.get("email")
    if new_email and new_email != profile.email:
        existing = db.query(Profile).filter(Profile.email == new_email, Profile.id != id).first()
        if existing:
            raise HTTPException(status_code=409, detail="?대? ?깅줉???대찓?쇱엯?덈떎.")
            
    if "email" in item: profile.email = item["email"]
    if "recovery_email" in item: profile.recovery_email = item["recovery_email"]
    if "status" in item: profile.status = item["status"]
    
    # [Fix] Add missing fields
    if "password" in item: profile.password = item["password"]
    if "profile_type" in item: profile.profile_type = item["profile_type"]
    if "channel_id" in item: profile.channel_id = item["channel_id"]
    if "engine_type" in item: profile.engine_type = item["engine_type"]
    
    # [NEW] Network Config
    if "proxy_mode" in item: profile.proxy_mode = item["proxy_mode"]
    if "proxy_protocol" in item: profile.proxy_protocol = item["proxy_protocol"]
    if "proxy_host" in item: profile.proxy_host = item["proxy_host"]
    if "proxy_port" in item: profile.proxy_port = item["proxy_port"]
    if "proxy_username" in item: profile.proxy_username = item["proxy_username"]
    if "proxy_password" in item: profile.proxy_password = item["proxy_password"]
    
    db.commit()
    return {"status": "updated", "profile": profile.id}

def remove_readonly(func, path, excinfo):
    """Clear the readonly bit and reattempt the removal"""
    try:
        os.chmod(path, stat.S_IWRITE)
        func(path)
    except Exception as e:
        print(f"Failed to remove readonly file {path}: {e}")

def _delete_profile_folder_background(folder_path: str):
    """Background task to delete profile folder"""
    try:
        if folder_path and os.path.exists(folder_path):
            print(f"🗑️ [Background] Deleting folder: {folder_path}")
            
            # Windows lock retry logic
            max_retries = 3
            for i in range(max_retries):
                try:
                    shutil.rmtree(folder_path, onerror=remove_readonly)
                    print(f"✅ [Background] Deleted folder: {folder_path}")
                    break
                except Exception as e:
                    if i < max_retries - 1:
                        print(f"⚠️ Retry {i+1} deleting {folder_path} due to lock...")
                        time.sleep(1)
                    else:
                        raise e
    except Exception as e:
        logger.error(f"❌ [Background] Failed to delete folder {folder_path}: {e}")

@router.delete("/profiles/{id}")
def delete_profile(id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    print(f"?뿊截?[DELETE REQUEST] ID received: '{id}'")
    profile = db.query(Profile).filter(Profile.id == id).first()
    if not profile: 
        print(f"??[DELETE ERROR] Profile {id} not found in DB.")
        raise HTTPException(404, "Profile not found")
    
    # Import models
    from app.models import ChannelAccess, YouTubeChannel, ChannelRole, VideoMetadataCache, ChannelDailyStats
    
    # 1. Clean up associated channels (YouTubeChannel and BrandChannel)
    try:
        from app.models import BrandChannel
        
        # Delete BrandChannel records owned by this profile
        brand_channels = db.query(BrandChannel).filter(
            BrandChannel.owner_profile_id == id
        ).all()
        for bc in brand_channels:
            print(f"?뿊截?[DELETE] Deleting BrandChannel: {bc.title} ({bc.channel_id})")
            db.delete(bc)
        db.flush()

        # Get all YouTube channel IDs that this profile accesses
        profile_channel_accesses = db.query(ChannelAccess).filter(
            ChannelAccess.profile_id == id
        ).all()
        profile_channel_ids = list(set([access.channel_id for access in profile_channel_accesses]))
        
        # Delete all channel_access records for this profile
        for access in profile_channel_accesses:
            db.delete(access)
        db.flush()
        print(f"?뵕 [DELETE] Deleted channel_access records for profile {id}")
        
        # For each channel, check if it is now orphaned (has no remaining access records)
        for channel_id in profile_channel_ids:
            remaining_access_count = db.query(ChannelAccess).filter(
                ChannelAccess.channel_id == channel_id
            ).count()
            
            if remaining_access_count == 0:
                print(f"?벟 [DELETE] Channel {channel_id} is orphaned. Cleaning up channel data...")
                
                # Delete video metadata cache
                video_caches = db.query(VideoMetadataCache).filter(
                    VideoMetadataCache.channel_id == channel_id
                ).all()
                for cache in video_caches:
                    db.delete(cache)
                
                # Delete daily stats
                daily_stats = db.query(ChannelDailyStats).filter(
                    ChannelDailyStats.channel_id == channel_id
                ).all()
                for stat in daily_stats:
                    db.delete(stat)
                
                # Delete the YouTube channel itself
                channel = db.query(YouTubeChannel).filter(
                    YouTubeChannel.channel_id == channel_id
                ).first()
                if channel:
                    ch_title = getattr(channel, 'title', None) or getattr(channel, 'channel_name', None) or channel.channel_id
                    print(f"?벟 [DELETE] Deleting YouTube channel: {ch_title} ({channel.channel_id})")
                    db.delete(channel)
                    
        db.flush()
            
    except Exception as e:
        print(f"?좑툘 [DELETE ERROR] Error deleting channel data: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(500, f"Failed to delete channel data: {str(e)}")
    
    # 3. Schedule Folder Deletion in Background
    from app.config import settings as _settings
    from pathlib import Path as _Path
    
    # folder_path媛 紐낆떆??寃쎌슦 ?ъ슜, ?놁쑝硫?湲곕낯 寃쎈줈(04_Profiles/{id}) 濡?fallback
    folder_to_delete = profile.folder_path
    if not folder_to_delete:
        constructed = str(_Path(getattr(_settings, 'root_download_path', _settings.MEDIA_ROOT)) / '04_Profiles' / id)
        if os.path.exists(constructed):
            folder_to_delete = constructed
            print(f"?좑툘 [DELETE] folder_path was None, using constructed path: {constructed}")
    
    if folder_to_delete:
        background_tasks.add_task(_delete_profile_folder_background, folder_to_delete)

    # 4. Delete from Database
    db.delete(profile)
    db.commit()
    
    print(f"??[DELETE] Profile {id} and all associated data deleted successfully")
    return {
        "status": "deleted", 
        "id": id, 
        "message": "Profile, channels, and associated data deleted",
        "channels_deleted": len(profile_channel_ids) if 'profile_channel_ids' in locals() else 0
    }


@router.post("/profiles/cleanup-orphan-folders")
def cleanup_orphan_profile_folders(db: Session = Depends(get_db)):
    """
    DB??議댁옱?섏? ?딅뒗 怨좎븘 ?꾨줈???대뜑瑜??먯??섍퀬 ??젣?⑸땲??
    - UUID 8?먮━ ?뺤떇 ?대뜑留?寃??(UC...濡??쒖옉?섎뒗 YouTube Channel ID ?대뜑 ?ы븿)
    - DB???녿뒗 Profile ID ?대뜑瑜?紐⑤몢 ?뺣━
    """
    from app.config import settings as _settings
    from pathlib import Path as _Path
    import shutil

    base_path = _Path(getattr(_settings, 'MEDIA_ROOT', 'C:/ViraLoopData')) / "04_Profiles"
    if not base_path.exists():
        return {"status": "ok", "deleted": [], "message": "04_Profiles directory not found"}

    # DB에 있는 유효한 Profile ID 및 폴더명 목록 수집
    valid_ids = set(r[0] for r in db.query(Profile.id).all())
    for (fp,) in db.query(Profile.folder_path).filter(Profile.folder_path != None).all():
        if fp:
            valid_ids.add(os.path.basename(os.path.normpath(fp)))
    
    deleted = []
    skipped = []
    errors = []

    for folder in base_path.iterdir():
        if not folder.is_dir():
            continue
        folder_name = folder.name
        # ?좏슚??Profile ID?대㈃ 嫄대꼫?
        if folder_name in valid_ids:
            skipped.append(folder_name)
            continue
        # 怨좎븘 ?대뜑 ??젣 ?쒕룄
        try:
            shutil.rmtree(str(folder), ignore_errors=True)
            if not folder.exists():
                deleted.append(folder_name)
                print(f"?뿊截?[Cleanup] Deleted orphan folder: {folder_name}")
            else:
                errors.append({"folder": folder_name, "reason": "Still in use by another process ??restart server and retry"})
        except Exception as e:
            errors.append({"folder": folder_name, "reason": str(e)})

    return {
        "status": "ok",
        "valid_profiles": list(skipped),
        "deleted_orphans": deleted,
        "errors": errors,
        "message": f"Deleted {len(deleted)} orphan folder(s). {len(errors)} could not be deleted (in use)."
    }


@router.post("/profiles/{id}/upload-key")
async def upload_profile_key(id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """ Upload & Validate client_secret.json """
    profile = db.query(Profile).filter(Profile.id == id).first()
    if not profile: raise HTTPException(404, "Profile not found")
    
    # [Guard] Check Quarantine
    verify_active_profile(profile)
    
    try:
        content = await file.read()
        json_content = json.loads(content.decode('utf-8'))
        client_config = json_content.get('installed') or json_content.get('web')
        if not client_config:
             raise HTTPException(400, "Invalid Key File: Missing 'installed' or 'web' root key.")
        if 'client_id' not in client_config or 'client_secret' not in client_config:
             raise HTTPException(400, "Invalid Key File: Missing client_id or client_secret.")

        # Save to file system (legacy compatibility)
        folder_path = profile.folder_path
        if not os.path.exists(folder_path): os.makedirs(folder_path, exist_ok=True)
        file_path = os.path.join(folder_path, "client_secret.json")
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(json_content, f, indent=4)
        
        # [NEW] Save to database for OAuth2 authentication
        profile.client_secret_json = json.dumps(json_content)
        
        # [NEW] Extract and save Google Project ID if available
        if 'project_id' in client_config:
            profile.google_project_id = client_config['project_id']
        
        # Note: access_token and refresh_token will be set during OAuth flow
        # For now, we just store the client secret
        
        profile.status = ProfileStatus.ACTIVE
        db.commit()
        
        logger.info(f"??OAuth2 credentials saved for profile {id}")
        return {
            "status": "success", 
            "path": file_path, 
            "msg": "Profile Activated with OAuth2 credentials",
            "has_oauth2": True,
            "project_id": profile.google_project_id
        }
    except json.JSONDecodeError: raise HTTPException(400, "Invalid JSON File")
    except HTTPException as e: raise e
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to upload key for profile {id}: {e}")
        raise HTTPException(500, str(e))

# --- Quarantine Management ---
@router.post("/profiles/{id}/quarantine")
def quarantine_profile(id: str, reason: str = Body(..., embed=True), db: Session = Depends(get_db)):
    """ [Global Enforcement] Lock Profile for 90 Days """
    profile = db.query(Profile).filter(Profile.id == id).first()
    if not profile: raise HTTPException(404, "Profile not found")

    profile.status = ProfileStatus.QUARANTINED
    profile.quarantine_start_date = datetime.now()
    profile.quarantine_reason = reason
    db.commit()
    
    logger.warning(f"?슚 Profile {id} has been QUARANTINED. Reason: {reason}")
    return {"status": "quarantined", "msg": "90-day lockdown initiated"}

from app.services.adb_service import adb_service
import time
from fastapi import Request

def _ensure_fresh_ip(timeout=30, method='soft'):
    """
    Cycles IP using ADB.
    Returns: (bool success, str new_ip)
    """
    logger.info(f"?썳截?[Security] Initiating IP Rotation (Method: {method})...")
    
    # 1. Get Old Public IP
    old_ip = adb_service.get_current_ip()
    logger.info(f"Old Public IP: {old_ip}")
    
    
    # 2. Trigger Rotation
    if not adb_service.rotate_ip(method=method):
         logger.error("??Rotation command failed")
         return False, "Rotation Trigger Failed"
    
    # 3. Wait for network to stabilize
    logger.info("??Waiting 1 second for network to stabilize...")
    time.sleep(1)
    
    # 4. Get new IP
    new_ip = adb_service.get_current_ip()
    logger.info(f"??Rotation complete. New Public IP: {new_ip}")
    
    return True, new_ip

class LaunchSetupRequest(BaseModel):
    rotate_ip: bool = False
    skip_browser: bool = False
    target_channel_id: Optional[str] = None
    platform: Optional[str] = None # 'tiktok', 'instagram', 'youtube', 'all'
    target_url: Optional[str] = None

@router.post("/profiles/{profile_id}/launch-setup")
async def launch_setup(
    profile_id: str, 
    payload: LaunchSetupRequest,
    db: Session = Depends(get_db)
):
    """ 2. Wizard Action: Open Browser for Setup (Multi-Tab) """
    try:
        print(f"DEBUG: launch_setup payload raw: {payload}")
        rotate_ip_flag = payload.rotate_ip
        skip_browser = payload.skip_browser
        target_channel_id = payload.target_channel_id
        target_url = payload.target_url

        if not target_url and payload.platform:
            if payload.platform == 'tiktok':
                target_url = "https://www.tiktok.com/creator-center"
            elif payload.platform == 'instagram':
                target_url = "https://www.instagram.com/"
            elif payload.platform == 'youtube':
                target_url = "https://studio.youtube.com/"
            elif payload.platform == 'all':
                target_url = "https://studio.youtube.com/,https://www.tiktok.com/creator-center,https://www.instagram.com/"

        print(f"DEBUG: launch_setup called for {profile_id}, rotate_ip: {rotate_ip_flag}, skip_browser: {skip_browser}, target_channel: {target_channel_id}, target_url: {target_url}")
        
        profile = db.query(Profile).filter(Profile.id == profile_id).first()
        email = profile.email if profile else None
        password = profile.password if profile else None
        target_serial = getattr(profile, "bound_device_serial", None) if profile else None

        new_ip = None
        if rotate_ip_flag:
            logger.info(f"⚡ [Setup] Triggering background Soft IP rotation for profile {profile_id} (Device: {target_serial or 'default'})")
            import threading
            def _bg_soft_rotate():
                try:
                    from app.services.adb_service import adb_service
                    adb_service.rotate_ip(serial=target_serial, method='soft')
                except Exception as rot_e:
                    logger.warning(f"⚠️ Background Soft IP rotation warning: {rot_e}")
            threading.Thread(target=_bg_soft_rotate, daemon=True).start()
        
        if skip_browser:
            return {"status": "ip_rotated", "new_ip": new_ip, "msg": "IP Rotation triggered."}
        
        if profile:
            # [Guard] Check Quarantine
            verify_active_profile(profile)
            skip_proxy = (profile.profile_type == ProfileType.CAPTAIN and not rotate_ip_flag)
            engine_mode = profile.engine_type or "cloakbrowser"
        else:
            skip_proxy = False
            engine_mode = "cloakbrowser"

        logger.info(f"🌐 Launching browser ({engine_mode}) for profile {profile_id} (URL: {target_url or 'default'})")
        
        if engine_mode == "cloakbrowser":
            success = stealth_ops.launch_for_setup(
                profile_id, 
                email=email, 
                password=password, 
                target_channel_id=target_channel_id, 
                skip_proxy_check=skip_proxy, 
                db=db,
                rotate_ip_on_close=False,
                target_url=target_url
            )
            if success:
                logger.info(f"✅ CloakBrowser launched successfully for profile {profile_id}")
                return {"status": "launched", "msg": "Browser opened for setup."}
            else:
                logger.error(f"❌ CloakBrowser launch failed for profile {profile_id}")
                raise HTTPException(500, "Failed to launch browser. Check backend logs for details.")
                
        elif engine_mode == "ixbrowser":
            from app.services.browser import get_browser_engine
            from app.services.browser.interface import ProfileConfig
            from pathlib import Path
            engine = get_browser_engine("ixbrowser")
            
            # Check if we already created it
            proxy_info = profile.proxy_info or {}
            ix_id = proxy_info.get("ixbrowser_profile_id")
            
            if not ix_id:
                p_host = profile.proxy_host or ""
                p_port = int(profile.proxy_port or 0)
                
                # If proxy_host is empty, assume iXBrowser handles it internally or it's a direct connection
                if not p_host:
                    p_type = "direct"
                else:
                    if profile.proxy_mode == "DIRECT_LTE":
                        p_type = "socks5"
                    else:
                        p_type = getattr(profile, "proxy_protocol", "http") or "http"
                    
                config = ProfileConfig(
                    profile_id=profile_id,
                    user_data_dir=Path.cwd(),
                    proxy_host=p_host,
                    proxy_port=p_port,
                    proxy_type=p_type,
                    proxy_username=getattr(profile, "proxy_username", ""),
                    proxy_password=getattr(profile, "proxy_password", ""),
                    lte_interface_ip=None,
                    engine_mode="ixbrowser",
                )
                ix_id = await engine.create_profile(config)
                proxy_info["ixbrowser_profile_id"] = ix_id
                profile.proxy_info = proxy_info
                db.commit()
            
            await engine.launch_browser(ix_id)
            logger.info(f"✅ iXBrowser launched successfully for profile {profile_id}")
            return {"status": "launched", "msg": "iXBrowser opened for setup."}
            
        else:
            logger.info(f"✅ Unsupported engine ({engine_mode}), bypassed launch")
            return {"status": "success", "message": "Unsupported engine, bypassed launch"}
            
    except HTTPException as http_e:
        import traceback
        from datetime import datetime
        err_msg = f"HTTPException {http_e.status_code}: {http_e.detail}\n{traceback.format_exc()}"
        logger.error(f"🔒 HTTPException in launch_setup for {profile_id}: {err_msg}")
        try:
            with open("launch_setup_error.log", "a", encoding="utf-8") as f:
                f.write(f"[{datetime.now()}] {err_msg}\n")
        except: pass
        raise
    except Exception as e:
        import traceback
        from datetime import datetime
        err_msg = f"Unexpected Error: {e}\n{traceback.format_exc()}"
        logger.error(f"🔒 Unexpected error in launch_setup for {profile_id}: {err_msg}")
        try:
            with open("launch_setup_error.log", "a", encoding="utf-8") as f:
                f.write(f"[{datetime.now()}] {err_msg}\n")
        except: pass
        raise HTTPException(500, f"Internal setup failure: {e}")

@router.post("/profiles/{profile_id}/verify-direct")
def verify_direct_profile(profile_id: str, db: Session = Depends(get_db)):
    """Fast-track verification endpoint for user confirmed logins"""
    profile = db.query(Profile).filter(Profile.id == profile_id).first()
    if profile:
        profile.status = ProfileStatus.ACTIVE
        db.commit()
    return {
        "overall_success": True,
        "profile_id": profile_id,
        "steps": [
            {
                "step": "login_check",
                "success": True,
                "message": "스텔스 세션 정상 검증 완료 (ACTIVE)"
            }
        ]
    }

@router.post("/profiles/{profile_id}/sync-channel")
def sync_channel_info(profile_id: str, db: Session = Depends(get_db)):
    """
    Syncs active brand channel info for a profile and creates/updates both YouTubeChannel and BrandChannel records.
    """
    from app.models import YouTubeChannel, BrandChannel, Profile
    import uuid

    profile = db.query(Profile).filter(Profile.id == profile_id).first()
    if not profile:
        raise HTTPException(404, "Profile not found")
        
    brand_channel = db.query(BrandChannel).filter(
        (BrandChannel.owner_profile_id == profile_id) | (BrandChannel.channel_id == profile.channel_id)
    ).first() if profile.channel_id else db.query(BrandChannel).filter(BrandChannel.owner_profile_id == profile_id).first()
    
    ch_id = None
    brand_name = None

    # Ensure proxy is active if DIRECT_LTE mode
    if profile.proxy_mode == "DIRECT_LTE":
        try:
            from app.services.adb_service import adb_service
            adb_service.ensure_every_proxy_socks_active()
        except Exception:
            pass

    # Try stealth channel detection directly via Patchright
    try:
        from app.services.stealth_ops_v2 import stealth_ops
        res = stealth_ops.scout_channel_directly(profile_id, db=db)
        if res.get("success"):
            ch_id = res.get("channel_id")
            brand_name = res.get("brand_name")
            logger.info(f"🎉 Stealth direct scout succeeded: ID={ch_id}, Name={brand_name}")
    except Exception as e:
        logger.warning(f"Stealth direct scouting fallback: {e}")
        
    # Safe Fallback to guarantee BrandChannel linkage if profile exists
    if not ch_id:
        ch_id = profile.channel_id or f"UC_{profile_id[:16]}"
    if not brand_name or brand_name in ("Detected Channel", "Unknown Channel"):
        default_base = profile.email.split('@')[0] if profile.email else profile_id[:6]
        brand_name = f"브랜드_{default_base}"
    else:
        import re
        brand_name = re.sub(r'^(?:[^\w가-힣\s\(\)]+|귣|뚮옖|釉뚮옖|\?+)+', '브랜드 ', brand_name).strip()
    
    profile.channel_id = ch_id
    profile.incubation_status = "MATURE"
    
    # Update/Create BrandChannel
    if not brand_channel:
        brand_channel = BrandChannel(
            channel_id=ch_id,
            title=brand_name,
            owner_profile_id=profile_id,
            account_email=profile.email,
            warmup_stage=3,
            warmup_status="IDLE"
        )
        db.add(brand_channel)
    else:
        brand_channel.channel_id = ch_id
        if brand_name: brand_channel.title = brand_name
        brand_channel.owner_profile_id = profile_id
        if profile.email: brand_channel.account_email = profile.email

    db.commit()
    
    return {
        "status": "success",
        "profile_id": profile_id,
        "channel_id": ch_id,
        "brand_name": brand_name,
        "incubation_status": "MATURE",
        "msg": "Brand channel synced successfully."
    }

@router.post("/profiles/{profile_id}/seed-warmup")
def start_seed_warmup(
    profile_id: str,
    payload: dict = Body(None),
    video_count: int = 3,
    visible: bool = True,
    db: Session = Depends(get_db)
):
    """
    [Phase 1] Pure Google Account Seed Warmup (Non-blocking Background Task)
    Watches videos with human entropy on clean Google Account to build watch history & trust score before channel creation.
    """
    from app.models import Profile
    from app.services.browser_session_manager import BrowserSessionManager
    import threading

    profile = db.query(Profile).filter(Profile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail=f"Profile not found: {profile_id}")

    count = video_count
    vis = visible
    if payload:
        count = payload.get("video_count", count)
        vis = payload.get("visible", True)

    # Immediately mark status as WARMING so UI reflects progress instantly
    profile.incubation_status = "WARMING"
    db.commit()

    session_mgr = BrowserSessionManager()
    session_mgr.set_job_progress(profile_id, "WARMING", f"시드 예열 백그라운드 태스크 준비 중 (목표: {count}편)...", 0, count)

    def _background_worker():
        try:
            session_mgr.run_profile_seed_warmup(
                profile_id=profile_id,
                video_count=count,
                visible=vis
            )
        except Exception as e:
            logger.error(f"[SeedWarmupBg] Worker error: {e}", exc_info=True)

    threading.Thread(target=_background_worker, daemon=True).start()

    return {
        "success": True,
        "message": f"시드 예열이 백그라운드에서 안전하게 시작되었습니다. (목표 영상: {count}편)",
        "profile_id": profile_id,
        "status": "WARMING",
        "video_count": count,
        "visible": vis
    }

@router.get("/profiles/{profile_id}/seed-warmup-progress")
def get_seed_warmup_progress(profile_id: str, db: Session = Depends(get_db)):
    """시드 예열 진행 상태 실시간 조회"""
    from app.models import Profile
    from app.services.browser_session_manager import BrowserSessionManager
    profile = db.query(Profile).filter(Profile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    session_mgr = BrowserSessionManager()
    progress = session_mgr.get_job_progress(profile_id)
    return {
        "profile_id": profile_id,
        "incubation_status": profile.incubation_status,
        "seed_history_count": profile.seed_history_count or 0,
        "progress": progress
    }

@router.post("/profiles/bulk-seed-warmup")
def bulk_seed_warmup(
    payload: dict = Body(None),
    db: Session = Depends(get_db)
):
    """
    [Phase 1] Pure Google Account Selective / Bulk Seed Warmup (Non-blocking Background Task)
    Sequential stealth warmup across specified profile_ids with inter-account safety delays & soft IP rotation.
    """
    from app.models import Profile
    from app.services.browser_session_manager import BrowserSessionManager
    import threading

    profile_ids = payload.get("profile_ids", []) if payload else []
    video_count = payload.get("video_count", 3) if payload else 3
    visible = payload.get("visible", True) if payload else True

    if not profile_ids:
        # Auto-detect ACTIVE profiles that require seed warmup
        profiles = db.query(Profile).filter(
            Profile.status == "ACTIVE",
            Profile.incubation_status.in_(["NEWBORN", None])
        ).all()
        profile_ids = [p.id for p in profiles]

    if not profile_ids:
        return {
            "success": True,
            "started": 0,
            "message": "시드 예열 대상 계정이 없습니다."
        }

    # Mark all selected profiles as WARMING in DB
    profiles_to_warm = db.query(Profile).filter(Profile.id.in_(profile_ids)).all()
    for p in profiles_to_warm:
        p.incubation_status = "WARMING"
    db.commit()

    session_mgr = BrowserSessionManager()
    session_mgr.reset_abort()

    def _bulk_seed_worker():
        logger.info(f"🌱 [BulkSeed] Starting sequential seed warmup for {len(profile_ids)} profiles...")
        for idx, p_id in enumerate(profile_ids):
            if session_mgr.is_aborted():
                logger.warning(f"🛑 [BulkSeed] Abort requested. Stopping at profile {idx}/{len(profile_ids)}.")
                break

            session_mgr.set_job_progress(
                p_id, 
                "WARMING", 
                f"[선택 계정 {idx+1}/{len(profile_ids)}] 시드 예열 준비 중...", 
                0, 
                video_count
            )

            try:
                session_mgr.run_profile_seed_warmup(
                    profile_id=p_id,
                    video_count=video_count,
                    visible=visible
                )
            except Exception as e:
                logger.error(f"[BulkSeed] Failed warming profile {p_id}: {e}", exc_info=True)

            # Soft IP rotation between accounts if ADB is active
            if idx < len(profile_ids) - 1 and not session_mgr.is_aborted():
                try:
                    from app.services.adb_device_service import adb_service
                    adb_service.rotate_ip(method='soft')
                except Exception:
                    pass
                time.sleep(3)

        logger.info(f"🏁 [BulkSeed] Finished processing {len(profile_ids)} profiles.")

    threading.Thread(target=_bulk_seed_worker, daemon=True).start()

    return {
        "success": True,
        "started": len(profile_ids),
        "profile_ids": profile_ids,
        "message": f"{len(profile_ids)}개 계정의 시드 예열이 백그라운드에서 순차 시작되었습니다."
    }


@router.post("/profiles/{profile_id}/create-brand-channel")
def create_brand_channel_for_profile(
    profile_id: str,
    payload: dict = Body(...),
    db: Session = Depends(get_db)
):
    """
    [Phase 2] Safe Brand Channel Creation with Human Navigation
    Creates a new YouTube brand channel under the warmed Google account and syncs real channel ID.
    """
    from app.models import Profile, BrandChannel, YouTubeChannel
    from app.services.stealth_ops_v2 import stealth_ops
    from app.services.automation.channel_creator import ChannelCreator

    profile = db.query(Profile).filter(Profile.id == profile_id).first()
    if not profile:
        raise HTTPException(404, "Profile not found")

    brand_name = payload.get("brand_name", "").strip()
    if not brand_name:
        brand_name = f"브랜드 {profile.email.split('@')[0] if profile.email else profile_id[:6]}"

    logger.info(f"✨ [BrandCreate] Starting automated brand channel creation: '{brand_name}' for profile {profile_id}")

    try:
        # Create stealth browser page for profile
        page = stealth_ops.create_page(profile_id=profile_id, headless=False)
        if not page:
            raise Exception("Failed to launch stealth browser")

        creator = ChannelCreator(stealth_ops)
        res = creator.create_brand_channel(page, brand_name)

        if not res.get("success"):
            try:
                stealth_ops.close_session(profile_id)
            except Exception:
                pass
            return {"success": False, "error": res.get("error", "Channel creation failed")}

        # Detect the newly created channel ID
        scout_res = creator.detect_active_channel(page)
        ch_id = scout_res.get("channel_id") or res.get("channel_id")
        actual_name = scout_res.get("brand_name") or brand_name

        try:
            stealth_ops.close_session(profile_id)
        except Exception:
            pass

        if not ch_id:
            ch_id = f"UC_{profile_id[:16]}" # fallback if detection timed out

        # Update profile and create BrandChannel & YouTubeChannel
        profile.channel_id = ch_id
        profile.incubation_status = "BRAND_CREATED"

        brand_ch = db.query(BrandChannel).filter(
            (BrandChannel.owner_profile_id == profile_id) | (BrandChannel.channel_id == ch_id)
        ).first()

        if not brand_ch:
            brand_ch = BrandChannel(
                channel_id=ch_id,
                title=actual_name,
                owner_profile_id=profile_id,
                account_email=profile.email,
                warmup_stage=0,
                warmup_status="IDLE"
            )
            db.add(brand_ch)
        else:
            brand_ch.channel_id = ch_id
            brand_ch.title = actual_name
            brand_ch.owner_profile_id = profile_id
            brand_ch.account_email = profile.email

        db.commit()

        # Post-creation soft IP rotation
        try:
            from app.services.adb_service import adb_service
            adb_service.rotate_ip(method='soft')
        except Exception:
            pass

        return {
            "success": True,
            "profile_id": profile_id,
            "channel_id": ch_id,
            "brand_name": actual_name,
            "incubation_status": "BRAND_CREATED"
        }

    except Exception as e:
        logger.error(f"[BrandCreate] Creation error: {e}", exc_info=True)
        try:
            stealth_ops.close_session(profile_id)
        except Exception:
            pass
        return {"success": False, "error": str(e)}

@router.post("/profiles/{id}/release")
def release_profile(id: str, db: Session = Depends(get_db)):
    """ [Manual Override] Release from Quarantine """
    profile = db.query(Profile).filter(Profile.id == id).first()
    if not profile: raise HTTPException(404, "Profile not found")

    profile.status = ProfileStatus.ACTIVE
    profile.quarantine_start_date = None
    profile.quarantine_reason = None
    db.commit()
    
    logger.info(f"🛡️ Profile {id} manually released from quarantine.")
    return {"status": "released", "msg": "Account restored to ACTIVE status"}

@router.get("/profiles", response_model=List[schemas.Profile])
def list_profiles(type: str = None, db: Session = Depends(get_db)):
    query = db.query(Profile)
    if type:
        query = query.filter(Profile.profile_type == type)
    
    profiles = query.all()
    dirty = False

    # [Self-Healing: Reconcile Orphaned WARMING States]
    from app.services.browser_session_manager import BrowserSessionManager
    session_mgr = BrowserSessionManager()
    for p in profiles:
        if p.incubation_status == "WARMING":
            prog = session_mgr.get_job_progress(p.id)
            if not prog or prog.get("status") not in ("WARMING", "RUNNING"):
                # No active background task running! Heal status
                new_st = "WARMED" if (p.seed_history_count or 0) >= 3 else "NEWBORN"
                logger.info(f"🩺 [Self-Healing] Reconciled zombie profile {p.email or p.id}: WARMING -> {new_st}")
                p.incubation_status = new_st
                dirty = True

    # [Auto-Release Check]
    if type == "TIN_CAN" or type is None:
        now = datetime.now()
        for p in profiles:
            if p.status == ProfileStatus.QUARANTINED and p.quarantine_start_date:
                # 90 Days Expiry
                if now - p.quarantine_start_date >= timedelta(days=90):
                    logger.info(f"🔓 [Auto-Release] {p.id} served 90 days. Restoring...")
                    p.status = ProfileStatus.ACTIVE
                    p.quarantine_start_date = None
                    p.quarantine_reason = None
                    dirty = True

    if dirty:
        db.commit()
            
    return profiles


@router.post("/profiles/{profile_id}/reset-status")
def reset_profile_status(profile_id: str, db: Session = Depends(get_db)):
    """고착된 프로필 상태 즉시 해제 및 초기화"""
    from app.services.browser_session_manager import BrowserSessionManager
    profile = db.query(Profile).filter(Profile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    session_mgr = BrowserSessionManager()
    try:
        session_mgr.close_session(profile_id)
    except Exception:
        pass
    session_mgr.set_job_progress(profile_id, "IDLE", "상태 초기화됨", 0, 0)

    profile.incubation_status = "WARMED" if (profile.seed_history_count or 0) >= 3 else "NEWBORN"
    db.commit()

    return {
        "success": True,
        "profile_id": profile_id,
        "incubation_status": profile.incubation_status,
        "message": f"프로필 상태가 '{profile.incubation_status}'(으)로 정상 초기화되었습니다."
    }


# --- Multi-Line Sovereign Network Endpoints ---
@router.get("/network/status")
def get_network_status(force: bool = False, db: Session = Depends(get_db)):
    """ 실시간 멀티 디바이스 및 격리 상태 조회 """
    try:
        base = adb_service.get_network_status_detail(force=force, db=db)
        
        # 프로필 분류 추가
        profiles = db.query(Profile).filter(Profile.status != ProfileStatus.QUARANTINED).all()
        lte_profiles, isp_profiles, direct_profiles = [], [], []
        seen_isp = set()
        isp_proxies = []
        for p in profiles:
            p_data = {
                "id": p.id, 
                "email": p.email, 
                "proxy_mode": p.proxy_mode,
                "proxy_host": p.proxy_host, 
                "proxy_port": p.proxy_port,
                "bound_device_serial": getattr(p, "bound_device_serial", None)
            }
            if p.proxy_mode == "DIRECT_LTE":
                lte_profiles.append(p_data)
            elif p.proxy_mode == "ISP_PROXY":
                isp_profiles.append(p_data)
                if p.proxy_host and p.proxy_port:
                    key = f"{p.proxy_host}:{p.proxy_port}"
                    if key not in seen_isp:
                        seen_isp.add(key)
                        isp_proxies.append({
                            "host": p.proxy_host,
                            "port": p.proxy_port,
                            "protocol": getattr(p, "proxy_protocol", "http") or "http",
                            "username": getattr(p, "proxy_username", None),
                            "account_count": 0
                        })
            else:
                direct_profiles.append(p_data)

        for isp in isp_proxies:
            isp["account_count"] = sum(1 for p in isp_profiles if p.get("proxy_host") == isp["host"] and str(p.get("proxy_port")) == str(isp["port"]))

        base["profiles"] = {"lte": lte_profiles, "isp": isp_profiles, "direct": direct_profiles}
        base["isp_proxies"] = isp_proxies
        return base
    except Exception as e:
        logger.error(f"Failed to get network status: {e}")
        return {"status": "ERROR", "detail": str(e)}

@router.get("/network/devices")
def get_network_devices(db: Session = Depends(get_db)):
    """ 연결된 모든 USB 스마트폰 노드 목록 및 할당 상태 조회 """
    try:
        return adb_service.get_connected_devices_info(db=db)
    except Exception as e:
        logger.error(f"Failed to get devices: {e}")
        return []

@router.post("/network/verify")
def verify_network_connection():
    """ Active Verification: Soft Rotate -> Wait -> Force Bind Check """
    try:
        public_ip = adb_service.perform_rotation_check()
        return {
            "status": "VERIFIED" if public_ip not in ["Verification Failed", "Interface Error"] else "FAILED",
            "public_ip": public_ip
        }
    except Exception as e:
        return {"status": "ERROR", "detail": str(e)}

@router.post("/network/rotate")
def rotate_ip(payload: dict = Body(...)):
    """ 대상 스마트폰 지정 IP 로테이션 (기본값: soft) """
    method = payload.get("method", "soft")
    serial = payload.get("serial")
    logger.info(f"⚡ [API] IP Rotation Request Received: Method={method}, Serial={serial or 'default'}")
    try:
        success = adb_service.rotate_ip(serial=serial, method=method)
        if success:
            new_ip = adb_service.get_current_ip(serial=serial, force=False)
            logger.info(f"✅ [API] IP Rotation Success (Method={method}, Serial={serial}, IP={new_ip})")
            return {"status": "rotated", "current_ip": new_ip, "serial": serial}
        else:
            logger.error(f"❌ [API] IP Rotation Failed (Method={method}, Serial={serial})")
            return {"status": "failed", "detail": "기기 응답 없음"}
    except Exception as e:
        logger.error(f"❌ [API] IP Rotation Exception: {e}")
        return {"status": "error", "detail": str(e)}

@router.post("/network/test-proxy")
def test_network_proxy(payload: dict = Body(...)):
    """ 사전 네트워크/프록시 연결 테스트 및 IP 반환 """
    import requests
    mode = payload.get("proxy_mode", "DIRECT_LTE")
    try:
        if mode == "DIRECT_LTE":
            serial = payload.get("serial")
            port = payload.get("port") or adb_service.get_device_port(serial)
            adb_service.ensure_every_proxy_socks_active(serial)
            proxy_url = f"socks5h://127.0.0.1:{port}"
            proxies = {"http": proxy_url, "https": proxy_url}
        elif mode == "ISP_PROXY":
            host = payload.get("host")
            port = payload.get("port", 1080)
            proto = payload.get("protocol", "http")
            user = payload.get("username")
            pwd = payload.get("password")
            if user and pwd:
                proxy_url = f"{proto}://{user}:{pwd}@{host}:{port}"
            else:
                proxy_url = f"{proto}://{host}:{port}"
            proxies = {"http": proxy_url, "https": proxy_url}
        else:
            proxies = None

        start = time.time()
        resp = requests.get("https://api.ipify.org", proxies=proxies, timeout=5.0)
        elapsed = round((time.time() - start) * 1000)
        public_ip = resp.text.strip()
        return {
            "status": "success",
            "public_ip": public_ip,
            "elapsed_ms": elapsed,
            "mode": mode
        }
    except Exception as e:
        logger.error(f"Proxy test failed: {e}")
        return {
            "status": "error",
            "detail": str(e),
            "mode": mode
        }

@router.post("/network/every-proxy/activate")
def activate_every_proxy(serial: Optional[str] = None):
    """Every Proxy SOCKS 프록시 원격 자동 활성화 (화면 기상 + 앱 실행 + 스위치 탭)"""
    try:
        success = adb_service.ensure_every_proxy_socks_active(serial)
        current_ip = adb_service.get_current_ip(serial, force=True)
        return {"status": "success" if success else "failed", "listening": success, "current_ip": current_ip}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

@router.post("/network/fix-permissions")
def fix_network_permissions():
    """Trigger elevated network fix (Route metrics)"""
    from app.services.network_monitor import network_monitor
    success, message = network_monitor.fix_metrics_elevated()
    return {"status": "success" if success else "error", "message": message}

@router.post("/network/source/{source}")
def switch_network_source(source: str): 
    from app.services.network_core import network_service
    network_service.set_internet_source(source)
    if source.upper() == "WIFI": adb_service.enable_wifi()
    elif source.upper() == "LTE": adb_service.disable_wifi()
    return {"status": "success", "target": source}

@router.post("/debug/connection-test")
def test_connection_via_proxy(url: str = Body("https://accounts.google.com/signin", embed=True)):
    """ 
    [Diagnosis] Test Connectivity via local SOCKS5 Proxy 
    Useful to distinguish between Chrome Config issue vs Network/Proxy issue.
    """
    proxies = {
        "http": "socks5://127.0.0.1:1080", 
        "https": "socks5://127.0.0.1:1080"
    }
    
    # [Pre-check] Is Proxy Running?
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    is_proxy_open = sock.connect_ex(('127.0.0.1', 1080)) == 0
    sock.close()
    
    if not is_proxy_open:
        return {"status": "error", "detail": "Proxy Port 1080 is Closed/Unreachable", "suggestion": "Check Backend Logs"}

    try:
        start = time.time()
        # verify=False for diagnosis only
        resp = requests.get(url, proxies=proxies, timeout=15, verify=False)
        elapsed = time.time() - start
        
        return {
            "status": "ok", 
            "code": resp.status_code, 
            "elapsed": f"{elapsed:.2f}s", 
            "reason": resp.reason,
            "can_reach_google": resp.status_code < 500
        }
    except Exception as e:
        return {
            "status": "error", 
            "detail": str(e), 
            "hint": "Check LTE Signal or Proxy Binding"
        }

# --- Brand Name Suggestion ---
from app.routers.creative import get_creative_engine, CreativeEngine

class BrandNameRequest(BaseModel):
    keywords: str
    previous_suggestions: list = []
    allow_korean: bool = True
    allow_english: bool = True
    provider: str = None  # From AIModelSelector
    model: str = None     # From AIModelSelector

@router.post("/profiles/suggest-brand-names")
async def suggest_brand_names(
    request: BrandNameRequest,
    engine: CreativeEngine = Depends(get_creative_engine),
    db: Session = Depends(get_db)
):
    """
    Generate professional, creative YouTube brand channel names using AI
    """
    # IMMEDIATE MARKER: Prove this code is running
    import datetime
    code_version = f"v2024-12-30-{datetime.datetime.now().strftime('%H%M%S')}"
    logger.info(f"?? Brand name generation started! Code version: {code_version}")
    
    try:
        keywords = request.keywords
        previous_suggestions = request.previous_suggestions
        allow_korean = request.allow_korean
        allow_english = request.allow_english
        
        # Use engine.llm_client (same as working generate-prompt)
        llm = engine.llm_client
        settings = llm.settings
        
        # Use script_analysis_model (matches Settings UI "湲곕낯 遺꾩꽍 紐⑤뜽" section)
        # Format: provider + model combo like "groq/llama-3.3-70b-versatile"
        model_to_use = settings.script_analysis_model or "opencode/deepseek-v4-flash-free"
        logger.info(f"Using model from settings.script_analysis_model: {model_to_use}")
        
        # Language Instruction Logic - CRITICAL: Place Korean instruction at FRONT
        if allow_korean and not allow_english:
            # KOREAN-ONLY MODE: Force Korean at the very front
            system_instruction = f"""?좑툘 CRITICAL LANGUAGE REQUIREMENT ?좑툘
???몄뀡?먯꽌??諛섎뱶???쒓?(Hangul)濡쒕쭔 ?묐떟?섏꽭??
?덉떆: ?몄깮2留? ?쒕땲?댄넚, 泥?텣?쇰뵒?? ?대Ⅴ?좎씠?쇨린 (O)
?덈? 湲덉?: LifeChron, AgelessVox, SeniorStory (X)

You are a Brand Strategy Director with 15+ years of experience.
Create 8 iconic, trademark-able channel names IN KOREAN ONLY.

NAMING STRATEGIES (?쒓? ?덉떆 ?ъ슜):
1. [媛먯꽦??: 遺꾩쐞湲곕? ?댁? ?대쫫 (?? 留덉쓬?뚮━, 轅덇씀?붾굹臾?
2. [?⑹꽦??: 媛쒕뀗 議고빀 (?? ?몄깮2留? ?쒕땲?댄넚)
3. [?좎“??: 李쎌옉 ?⑥뼱 (?? 寃쒗넚, 媛ъ꽦)
4. [??좏삎]: ?곸쭠???섎? (?? ?몃Ⅸ?? 蹂꾨튆?뺤썝)
5. [由щ벉??: ?댁쑉媛??덈뒗 ?대쫫 (?? 鍮쏅굹由? ?щ떖?쒕갇)

RESTRICTIONS:
- NO English names (LifeChron, AgelessVox = 利됱떆 ?덈씫)
- NO generic suffixes (TV, Hub, Zone)
- NO duplicates from: {', '.join(previous_suggestions[:10]) if previous_suggestions else 'None'}

OUTPUT FORMAT:
Return ONLY 8 Korean names, one per line. No numbering. ?쒓?留?"""
        else:
            # ENGLISH MODE (default)
            system_instruction = f"""You are a Brand Strategy Director with 15+ years of experience.
Your goal is to create 8 iconic, trademark-able channel names.

NAMING STRATEGIES (Use a mix):
1. [Evocative]: Capture the mood (e.g. Spotify, Notion)
2. [Compound]: Combine concepts (e.g. GameVerse, TechFlow)
3. [Neologism]: Invented words (e.g. Kodak, Xerox)
4. [Metaphorical]: Symbolic meaning (e.g. Amazon, Apple)
5. [Rhythmic]: Alliteration or Rhyme (e.g. Coca-Cola, PayPal)

RESTRICTIONS:
- NO generic suffixes (Hub, Zone, TV, Channel).
- NO literal descriptions.
- NO duplicates from: {', '.join(previous_suggestions[:10]) if previous_suggestions else 'None'}

OUTPUT FORMAT:
Return ONLY the 8 names, one per line. No numbering."""

        # Dynamic User Prompt based on Language
        prompt_strategies = ""
        if allow_korean and not allow_english:
             prompt_strategies = "For Korean names, use natural, catchy phrasing (e.g. '?몄깮2留?, '?쒕땲?댄넚'). Ensure they are written in Hangul."
        elif allow_english and not allow_korean:
             prompt_strategies = "For English names, use modern branding (e.g. 'SilverLining', 'AgeWise')."
        else:
             prompt_strategies = "For Korean names, use Hangul. For English names, use modern branding."

        user_prompt = f"""Target Keywords: "{keywords}"

Apply the naming strategies to generate 8 premium names.
{prompt_strategies}

Generate now."""

        logger.info(f"=== Brand Name Generation Started ===")
        logger.info(f"Keywords: {keywords}")
        logger.info(f"Language: Korean={allow_korean}, English={allow_english}")
        logger.info(f"Previous suggestions count: {len(previous_suggestions)}")
        logger.info(f"Model to use: {model_to_use}")
        
        # Generate with AI
        try:
            logger.info(f"Calling LLM with model: {model_to_use}")
            
            response = llm.generate_content(
                prompt=user_prompt,
                model_name=model_to_use,
                system_instruction=system_instruction
            )
            
            # Handle dict or string response (same as generate-prompt)
            if isinstance(response, dict):
                response = response.get("content", "")
            
            logger.info(f"??AI Response received! Type: {type(response)}, Length: {len(response) if response else 0} chars")
            if response:
                logger.info(f"Response preview: {response[:200]}...")
            else:
                logger.error(f"??Response is None or empty!")
            
        except Exception as e:
            logger.error(f"??AI generation failed: {type(e).__name__}: {e}")
            logger.error(f"Traceback:", exc_info=True)
            raise  # Re-raise to trigger fallback
        
        # Parse response (Plaintext List Strategy)
        if not response:
            logger.error("??AI returned None/empty response!")
            raise Exception("AI returned empty response")
            
        logger.info(f"Parsing plaintext response...")
        # Split by newlines and clean
        lines = response.strip().split('\n')
        suggestions = [line.strip() for line in lines if line.strip()]
        
        logger.info(f"Found {len(suggestions)} raw lines")
        
        # Cleaning logic
        cleaned_suggestions = []
        for name in suggestions:
            # Remove numbering (1. Name -> Name)
            # Regex to remove leading numbers/bullets
            import re
            cleaned = re.sub(r'^[\d\-\.\)\*\s]+', '', name).strip()
            
            # Remove quotes
            cleaned = cleaned.strip('"\'')
            
            # Skip invalid lengths
            if len(cleaned) < 2 or len(cleaned) > 30:
                continue
                
            # Strict Language Filtering
            is_korean = any('\uac00' <= char <= '\ud7af' for char in cleaned)
            
            # Log filter decision for debugging
            # logger.info(f"Filter Check: '{cleaned}' | IsKorean: {is_korean} | Config: K={allow_korean}/E={allow_english}")

            if allow_korean and not allow_english:
                if not is_korean:
                    continue # Strict Korean Mode: Drop non-Korean
            elif allow_english and not allow_korean:
                if is_korean:
                    continue # Strict English Mode: Drop Korean (rare but possible)

            # Generic Filter (Secondary)
            if not is_korean:
                if any(forbidden in cleaned.lower() for forbidden in ['hub', 'zone', 'channel', 'media', 'tube', 'tv']):
                   continue
            
            # Skip if already in previous suggestions
            if cleaned in previous_suggestions:
                continue
                
            cleaned_suggestions.append(cleaned)
        
        # Remove duplicates while preserving order
        seen = set()
        unique_suggestions = []
        for name in cleaned_suggestions:
            if name.lower() not in seen:
                seen.add(name.lower())
                unique_suggestions.append(name)
        
        # Ensure we have 8 suggestions
        unique_suggestions = unique_suggestions[:8]
        
        if not unique_suggestions:
            logger.warning("?좑툘 No valid suggestions found after filtering.")
            
        return {
            "suggestions": unique_suggestions,
            "model_used": model_to_use,
            "language_mode": "korean" if (allow_korean and not allow_english) else "english" if (allow_english and not allow_korean) else "mixed",
            "code_version": code_version,
            # Debug fields
            "raw_response": response[:500] if response else "EMPTY",
            "raw_line_count": len(suggestions) if 'suggestions' in dir() else 0,
            "after_filter_count": len(cleaned_suggestions) if 'cleaned_suggestions' in dir() else 0
        }
        
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        logger.error(f"??Brand name generation failed: {type(e).__name__}: {e}")
        logger.error(f"Full traceback: {error_traceback}")
        # Return error details for debugging
        return {
            "suggestions": [],
            "error": str(e),
            "error_type": type(e).__name__,
            "traceback": error_traceback[:500],
            "model_attempted": model_to_use if 'model_to_use' in dir() else "NOT_SET",
            "code_version": code_version if 'code_version' in dir() else "UNKNOWN"
        }



# --- Automation Endpoints ---
@router.post("/profiles/{profile_id}/automation/execute")
async def execute_automation(
    profile_id: str,  # Profile ID is UUID (String), not Integer
    brand_name: str = None,
    admin_email: str = None,
    auto_create_channel: bool = False,
    auto_delegate_admin: bool = False,
    db: Session = Depends(get_db)
):
    """Execute automation workflow for a profile"""
    # Profile.id is String (UUID), query directly
    profile = db.query(Profile).filter(Profile.id == profile_id).first()
    if not profile:
        raise HTTPException(404, f"Profile not found: {profile_id}")
    
    if auto_create_channel and not brand_name:
        raise HTTPException(400, "Brand name required")
    
    config = AutomationConfig(
        auto_create_channel=auto_create_channel,
        auto_delegate_admin=False,  # DEPRECATED
        brand_name=brand_name,
        admin_email=admin_email
    )
    
    # Create orchestrator instance with db
    orchestrator = AutomationOrchestrator(db)
    results = await orchestrator.execute(str(profile_id), config)
    
    # Update channel_id if created OR detected
    for step in results.get("steps", []):
        # Case A: Auto-Creation Success
        if step.get("step") == "create_channel" and step.get("success"):
            channel_url = step.get("channel_url", "")
            if "youtube.com/channel/" in channel_url:
                channel_id = channel_url.split("/channel/")[-1].split("?")[0]
                profile.channel_id = channel_id
                db.commit()
                
        # Case B: Manual Detection Success
        if step.get("step") == "detect_channel" and step.get("success"):
            channel_id = step.get("channel_id")
            if channel_id:
                logger.info(f"?뮶 Saving Detected Channel ID: {channel_id}")
                profile.channel_id = channel_id
                db.commit()
    
    return results
