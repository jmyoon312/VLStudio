from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Body, BackgroundTasks
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
from app.models import ProfileType, ProfileStatus, Profile # Explicit imports if likely needed or ensuring availability

from app.database import get_db
from app import models, schemas, crud
from app.services.credential_manager import CredentialManager
from app.services.adb_service import adb_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# --- DEPRECATED: TinCanAccount & CaptainAccount (Migrated to Profile) ---
# See models.py: Profile model replaces these. 
# Endpoints below are kept commented out for reference or future cleanup.

# --- Profile Lifecycle (Wizard) ---
from app.models import Profile, ProfileType, ProfileStatus, BrandChannel
from app.services.stealth_ops_v2 import stealth_ops
import uuid
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
    target_channel_id: Optional[str] = None

class CopyFromCaptainRequest(BaseModel):
    captain_id: str

# [NEW] Copy Captain Profile (No Browser Launch)
@router.post("/profiles/{tin_can_id}/copy-from-captain")
async def copy_from_captain(
    tin_can_id: str,
    payload: CopyFromCaptainRequest,
    db: Session = Depends(get_db)
):
    """
    Captain 프로필을 TIN_CAN 프로필로 복사 (브라우저 실행 없음)
    
    Step 0: Captain 세션 재사용
    - Captain 프로필 폴더를 복사하여 TIN_CAN 전용 프로필 생성
    - 로그인 세션, 쿠키 자동 복사
    - 브라우저 실행 없이 백그라운드에서 처리
    """
    try:
        captain_id = payload.captain_id
        
        # 1. Captain 프로필 확인
        captain = db.query(Profile).filter(Profile.id == captain_id).first()
        if not captain:
            raise HTTPException(404, "Captain profile not found")
        if captain.profile_type != ProfileType.CAPTAIN:
            raise HTTPException(400, "Selected profile is not a Captain account")
        
        # 2. TIN_CAN 프로필 확인
        tin_can = db.query(Profile).filter(Profile.id == tin_can_id).first()
        if not tin_can:
            raise HTTPException(404, "TIN_CAN profile not found")
        
        # 3. 프로필 경로 설정
        # [FIX] Use DB settings for cross-platform/environment support
        settings_db = crud.get_settings(db)
        profile_base = os.path.join(settings_db.root_download_path, "Profiles")
        
        captain_profile_path = f"{profile_base}/{captain_id}"
        tin_can_profile_path = f"{profile_base}/{captain_id}_{tin_can_id}"
        
        # 4. Captain 프로필 존재 확인
        if not os.path.exists(captain_profile_path):
            raise HTTPException(404, f"Captain profile folder not found: {captain_profile_path}")
        
        # 5. 이미 복사된 프로필이 있으면 삭제
        if os.path.exists(tin_can_profile_path):
            logger.info(f"🗑️ Removing existing TIN_CAN profile: {tin_can_profile_path}")
            def remove_readonly(func, path, _):
                os.chmod(path, stat.S_IWRITE)
                func(path)
            shutil.rmtree(tin_can_profile_path, onerror=remove_readonly)
        
        # 6. Captain 프로필 복사
        logger.info(f"📁 Copying Captain profile to TIN_CAN...")
        logger.info(f"   Source: {captain_profile_path}")
        logger.info(f"   Target: {tin_can_profile_path}")
        
        shutil.copytree(
            captain_profile_path,
            tin_can_profile_path,
            ignore=shutil.ignore_patterns(
                'Cache', 'Code Cache', 'GPUCache', 'Service Worker',
                'ShaderCache', 'DawnCache', '*.log', 'Crashpad'
            ),
            dirs_exist_ok=True
        )
        
        
        logger.info(f"✅ Profile copied successfully")
        
        # 7. DB 업데이트
        # CRITICAL FIX: DO NOT overwrite folder_path here!
        # The backup folder (captain_id_tin_can_id) is for future delegation only
        # The TinCan's folder_path must remain as "Profiles/{tin_can_id}" for clean login
        # tin_can.folder_path = tin_can_profile_path  # REMOVED - causes Captain session leakage
        
        # Track delegation relationship in Captain profile
        if captain.delegated_tincan_ids is None:
            captain.delegated_tincan_ids = []
        if tin_can_id not in captain.delegated_tincan_ids:
            captain.delegated_tincan_ids.append(tin_can_id)
            logger.info(f"📝 Added {tin_can_id} to Captain's delegated list")
        
        db.commit()
        
        return {
            "success": True,
            "backup_path": tin_can_profile_path,
            "message": "Captain 세션이 백업되었습니다. 로그인은 본인 계정으로 진행하세요."
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# [Access Control Guard]
def verify_active_profile(profile: Profile):
    """ Enforce Quarantine Lock """
    if profile.status == ProfileStatus.QUARANTINED:
        release_date = "Unknown"
        if profile.quarantine_start_date:
            release_date = (profile.quarantine_start_date + timedelta(days=90)).strftime("%Y-%m-%d")
        
        detail_msg = f"격리 조치된 계정입니다. (해제 예정일: {release_date}) - 사유: {profile.quarantine_reason}"
        raise HTTPException(status_code=403, detail=detail_msg)


@router.post("/profiles/draft")
def create_draft_profile(type: str = "TIN_CAN", payload: dict = Body(None), db: Session = Depends(get_db)):
    """ 1. Wizard Start: Generate ID with optional Email pre-check """
    
    # [Pre-check] Email Duplication
    email = payload.get("email") if payload else None
    password = payload.get("password") if payload else None  # Now also extracting password
    
    if email:
        existing = db.query(Profile).filter(Profile.email == email).first()
        if existing:
            raise HTTPException(status_code=409, detail="이미 등록된 이메일입니다.")

    try:
        new_id = str(uuid.uuid4())[:8]
        p_type = ProfileType.TIN_CAN if type == "TIN_CAN" else ProfileType.CAPTAIN
        
        # Get profile base path from settings (root_download_path/Profiles)
        settings_db = crud.get_settings(db)
        profile_base = os.path.join(settings_db.root_download_path, "Profiles")
        
        # Ensure directory exists immediately
        profile_path = os.path.join(profile_base, new_id)
        if not os.path.exists(profile_path):
            os.makedirs(profile_path)
        
        new_profile = Profile(
            id=new_id,
            profile_type=p_type,
            status=ProfileStatus.DRAFT,
            folder_path=profile_path,
            email=email,     # Store email immediately if provided
            password=password  # Store password for auto-login
        )
        db.add(new_profile)
        db.commit()
        return {"id": new_id, "status": "DRAFT", "type": p_type}
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
            raise HTTPException(status_code=409, detail="이미 등록된 이메일입니다.")
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
            raise HTTPException(status_code=409, detail="이미 등록된 이메일입니다.")
            
    if "email" in item: profile.email = item["email"]
    if "recovery_email" in item: profile.recovery_email = item["recovery_email"]
    if "status" in item: profile.status = item["status"]
    
    # [Fix] Add missing fields
    if "password" in item: profile.password = item["password"]
    if "profile_type" in item: profile.profile_type = item["profile_type"]
    if "channel_id" in item: profile.channel_id = item["channel_id"]
    
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
            print(f"📂 [Background] Deleting folder: {folder_path}")
            shutil.rmtree(folder_path, onerror=remove_readonly)
            print(f"✅ [Background] Deleted folder: {folder_path}")
    except Exception as e:
        logger.error(f"❌ [Background] Failed to delete folder {folder_path}: {e}")

@router.delete("/profiles/{id}")
def delete_profile(id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    print(f"🗑️ [DELETE REQUEST] ID received: '{id}'")
    profile = db.query(Profile).filter(Profile.id == id).first()
    if not profile: 
        print(f"❌ [DELETE ERROR] Profile {id} not found in DB.")
        raise HTTPException(404, "Profile not found")
    
    # Import models
    from app.models import ChannelAccess, YouTubeChannel, ChannelRole, VideoMetadataCache, ChannelDailyStats
    
    # 1. Find all channels owned by this profile (OWNER role)
    try:
        owned_channel_accesses = db.query(ChannelAccess).filter(
            ChannelAccess.profile_id == id,
            ChannelAccess.role == ChannelRole.OWNER
        ).all()
        
        owned_channel_ids = [access.channel_id for access in owned_channel_accesses]
        
        if owned_channel_ids:
            print(f"📺 [DELETE] Found {len(owned_channel_ids)} owned channels to delete")
            
            # Delete cache data for these channels
            for channel_id in owned_channel_ids:
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
                
                print(f"🗑️ [DELETE] Cleaned cache data for channel {channel_id}")
            
            # Delete all channel_access records for these channels (both OWNER and MANAGER)
            all_accesses = db.query(ChannelAccess).filter(
                ChannelAccess.channel_id.in_(owned_channel_ids)
            ).all()
            for access in all_accesses:
                db.delete(access)
            
            print(f"🔗 [DELETE] Deleted {len(all_accesses)} channel_access records")
            
            # Delete the YouTube channels themselves
            channels = db.query(YouTubeChannel).filter(
                YouTubeChannel.channel_id.in_(owned_channel_ids)
            ).all()
            for channel in channels:
                print(f"📺 [DELETE] Deleting channel: {channel.channel_name} ({channel.channel_id})")
                db.delete(channel)
            
            db.flush()
            print(f"✅ [DELETE] Deleted {len(channels)} YouTube channels")
        
        # 2. Delete any remaining channel_access records where this profile is MANAGER
        remaining_accesses = db.query(ChannelAccess).filter(
            ChannelAccess.profile_id == id
        ).all()
        
        if remaining_accesses:
            print(f"🔗 [DELETE] Found {len(remaining_accesses)} remaining channel_access records (MANAGER role)")
            for access in remaining_accesses:
                db.delete(access)
            db.flush()
            print(f"✅ [DELETE] Deleted remaining channel_access records")
            
    except Exception as e:
        print(f"⚠️ [DELETE ERROR] Error deleting channel data: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(500, f"Failed to delete channel data: {str(e)}")
    
    # 3. Schedule Folder Deletion in Background
    if profile.folder_path:
        background_tasks.add_task(_delete_profile_folder_background, profile.folder_path)

    # 4. Delete from Database
    db.delete(profile)
    db.commit()
    
    print(f"✅ [DELETE] Profile {id} and all associated data deleted successfully")
    return {
        "status": "deleted", 
        "id": id, 
        "message": "Profile, channels, and associated data deleted",
        "channels_deleted": len(owned_channel_ids) if owned_channel_ids else 0
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
        
        logger.info(f"✅ OAuth2 credentials saved for profile {id}")
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

@router.get("/captain/{profile_id}/channels", response_model=List[schemas.BrandChannel])
def list_captain_channels(profile_id: str, db: Session = Depends(get_db)):
    """ List all brand channels managed by this Captain """
    profile = db.query(Profile).filter(Profile.id == profile_id).first()
    if not profile: return []
    
    # [Fix] Use BrandChannel directly, filtering by owner_profile_id if applicable
    # or return all active channels if no explicit link established yet
    # Assuming 'owner_profile_id' exists in BrandChannel as per previous migration
    try:
        channels = db.query(BrandChannel).filter(
            BrandChannel.owner_profile_id == profile_id,
            BrandChannel.is_active == True
        ).all()
        return channels
    except Exception:
        # Fallback if column issue persists, return all active
        return db.query(BrandChannel).filter(BrandChannel.is_active == True).all()

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
    
    logger.warning(f"🚨 Profile {id} has been QUARANTINED. Reason: {reason}")
    return {"status": "quarantined", "msg": "90-day lockdown initiated"}

from app.services.adb_service import adb_service
import time
from fastapi import Request

def _ensure_fresh_ip(timeout=30, method='soft'):
    """
    Cycles IP using ADB.
    Returns: (bool success, str new_ip)
    """
    logger.info(f"🛡️ [Security] Initiating IP Rotation (Method: {method})...")
    
    # 1. Get Old Public IP
    old_ip = adb_service.get_current_ip()
    logger.info(f"Old Public IP: {old_ip}")
    
    
    # 2. Trigger Rotation
    if not adb_service.rotate_ip(method=method):
         logger.error("❌ Rotation command failed")
         return False, "Rotation Trigger Failed"
    
    # 3. Wait for network to stabilize
    logger.info("⏳ Waiting 1 second for network to stabilize...")
    time.sleep(1)
    
    # 4. Get new IP
    new_ip = adb_service.get_current_ip()
    logger.info(f"✅ Rotation complete. New Public IP: {new_ip}")
    
    return True, new_ip

class LaunchSetupRequest(BaseModel):
    rotate_ip: bool = False
    skip_browser: bool = False
    target_channel_id: Optional[str] = None

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

        print(f"DEBUG: launch_setup called for {profile_id}, rotate_ip: {rotate_ip_flag}, skip_browser: {skip_browser}, target_channel: {target_channel_id}")
        
        new_ip = None
        if rotate_ip_flag:
            # Enforce 'soft' rotation (Data Toggle) as requested
            success, new_ip = _ensure_fresh_ip(method='soft')
            if not success:
                # If rotation fails, we should probably ERROR out rather than continue to launch browser
                # But if skip_browser is True, we definitely error out.
                raise HTTPException(503, f"Failed to rotate IP: {new_ip}")
        
        if skip_browser:
            return {"status": "ip_rotated", "new_ip": new_ip, "msg": "IP Rotated successfully."}
        
        profile = db.query(Profile).filter(Profile.id == profile_id).first()
        if not profile: raise HTTPException(404, "Profile not found")

        # [Guard] Check Quarantine
        verify_active_profile(profile)

        # Use new signature with target_channel_id and db
        # For Captain accounts during initial setup, skip proxy check to avoid connection errors
        skip_proxy = (profile.profile_type == ProfileType.CAPTAIN and not rotate_ip_flag)
        
        logger.info(f"🚀 Launching browser for profile {profile_id}")
        success = stealth_ops.launch_for_setup(profile_id, target_channel_id=target_channel_id, skip_proxy_check=skip_proxy, db=db)
        
        if success:
            logger.info(f"✅ Browser launched successfully for profile {profile_id}")
            return {"status": "launched", "msg": "Browser opened for setup."}
        else:
            logger.error(f"❌ Browser launch failed for profile {profile_id}")
            raise HTTPException(500, "Failed to launch browser. Check backend logs for details.")
    except HTTPException:
        raise
    except Exception as e:
        import logging
        import traceback
        logger = logging.getLogger(__name__)
        logger.error(f"🚨 Unexpected error in launch_setup for {profile_id}: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

@router.post("/profiles/{id}/release")
def release_profile(id: str, db: Session = Depends(get_db)):
    """ [Manual Override] Release from Quarantine """
    profile = db.query(Profile).filter(Profile.id == id).first()
    if not profile: raise HTTPException(404, "Profile not found")

    profile.status = ProfileStatus.ACTIVE
    profile.quarantine_start_date = None
    profile.quarantine_reason = None
    db.commit()
    
    logger.info(f"✅ Profile {id} manually released from quarantine.")
    return {"status": "released", "msg": "Account restored to ACTIVE status"}

@router.get("/profiles", response_model=List[schemas.Profile])
def list_profiles(type: str = None, db: Session = Depends(get_db)):
    query = db.query(Profile)
    if type:
        query = query.filter(Profile.profile_type == type)
    
    profiles = query.all()
    
    # [Auto-Release Check]
    if type == "TIN_CAN" or type is None:
        dirty = False
        now = datetime.now()
        for p in profiles:
            if p.status == ProfileStatus.QUARANTINED and p.quarantine_start_date:
                # 90 Days Expiry
                if now - p.quarantine_start_date >= timedelta(days=90):
                    print(f"🔓 [Auto-Release] {p.id} served 90 days. Restoring...")
                    p.status = ProfileStatus.ACTIVE
                    p.quarantine_start_date = None
                    p.quarantine_reason = None
                    dirty = True
        if dirty:
            db.commit()
            
    return profiles


# --- Legacy & Network Endpoints (Maintained for Backward Compatibility) ---
# --- Legacy & Network Endpoints (Maintained for Backward Compatibility) ---
@router.get("/network/status")
def get_network_status():
    """ Passive Status Check (Fast) """
    print(f"API HIT: /resources/network/status")
    try:
        # returns { adb_connected, mobile_data_enabled, tethering_ip, status ... }
        return adb_service.get_network_status_detail()
    except Exception as e:
        return {"status": "ERROR", "detail": str(e)}

@router.post("/network/verify")
def verify_network_connection():
    """ Active Verification: Soft Rotate -> Wait -> Force Bind Check """
    print(f"API HIT: /resources/network/verify")
    try:
        public_ip = adb_service.perform_rotation_check()
        return {
            "status": "VERIFIED" if public_ip not in ["Verification Failed", "Interface Error"] else "FAILED",
            "public_ip": public_ip
        }
    except Exception as e:
        return {"status": "ERROR", "detail": str(e)}

@router.post("/network/rotate")
def rotate_ip(method: str = Body("soft", embed=True)):
    logger.info(f"🌐 [API] IP Rotation Request Received: Method={method}")
    try:
        success = adb_service.rotate_ip(method=method)
        if success:
            logger.info(f"✅ [API] IP Rotation Success (Method={method})")
            return {"status": "rotated"}
        else:
            logger.error(f"❌ [API] IP Rotation Failed (Method={method})")
            return {"status": "failed"}
    except Exception as e:
        logger.error(f"🔥 [API] IP Rotation Exception: {e}")
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
        "http": "socks5://127.0.0.1:10800", 
        "https": "socks5://127.0.0.1:10800"
    }
    
    # [Pre-check] Is Proxy Running?
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    is_proxy_open = sock.connect_ex(('127.0.0.1', 10800)) == 0
    sock.close()
    
    if not is_proxy_open:
        return {"status": "error", "detail": "Proxy Port 10800 is Closed/Unreachable", "suggestion": "Check Backend Logs"}

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
    logger.info(f"🚀 Brand name generation started! Code version: {code_version}")
    
    try:
        keywords = request.keywords
        previous_suggestions = request.previous_suggestions
        allow_korean = request.allow_korean
        allow_english = request.allow_english
        
        # Use engine.llm_client (same as working generate-prompt)
        llm = engine.llm_client
        settings = llm.settings
        
        # Use script_analysis_model (matches Settings UI "기본 분석 모델" section)
        # Format: provider + model combo like "groq/llama-3.3-70b-versatile"
        model_to_use = settings.script_analysis_model or "groq/llama-3.3-70b-versatile"
        logger.info(f"Using model from settings.script_analysis_model: {model_to_use}")
        
        # Language Instruction Logic - CRITICAL: Place Korean instruction at FRONT
        if allow_korean and not allow_english:
            # KOREAN-ONLY MODE: Force Korean at the very front
            system_instruction = f"""⚠️ CRITICAL LANGUAGE REQUIREMENT ⚠️
이 세션에서는 반드시 한글(Hangul)로만 응답하세요.
예시: 인생2막, 시니어톡, 청춘라디오, 어르신이야기 (O)
절대 금지: LifeChron, AgelessVox, SeniorStory (X)

You are a Brand Strategy Director with 15+ years of experience.
Create 8 iconic, trademark-able channel names IN KOREAN ONLY.

NAMING STRATEGIES (한글 예시 사용):
1. [감성형]: 분위기를 담은 이름 (예: 마음소리, 꿈꾸는나무)
2. [합성형]: 개념 조합 (예: 인생2막, 시니어톡)
3. [신조어]: 창작 단어 (예: 겜톡, 갬성)
4. [은유형]: 상징적 의미 (예: 푸른숲, 별빛정원)
5. [리듬형]: 운율감 있는 이름 (예: 빛나리, 달달한밤)

RESTRICTIONS:
- NO English names (LifeChron, AgelessVox = 즉시 탈락)
- NO generic suffixes (TV, Hub, Zone)
- NO duplicates from: {', '.join(previous_suggestions[:10]) if previous_suggestions else 'None'}

OUTPUT FORMAT:
Return ONLY 8 Korean names, one per line. No numbering. 한글만."""
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
             prompt_strategies = "For Korean names, use natural, catchy phrasing (e.g. '인생2막', '시니어톡'). Ensure they are written in Hangul."
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
            
            logger.info(f"✅ AI Response received! Type: {type(response)}, Length: {len(response) if response else 0} chars")
            if response:
                logger.info(f"Response preview: {response[:200]}...")
            else:
                logger.error(f"❌ Response is None or empty!")
            
        except Exception as e:
            logger.error(f"❌ AI generation failed: {type(e).__name__}: {e}")
            logger.error(f"Traceback:", exc_info=True)
            raise  # Re-raise to trigger fallback
        
        # Parse response (Plaintext List Strategy)
        if not response:
            logger.error("❌ AI returned None/empty response!")
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
            logger.warning("⚠️ No valid suggestions found after filtering.")
            
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
        logger.error(f"❌ Brand name generation failed: {type(e).__name__}: {e}")
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
    
    if auto_delegate_admin and not admin_email:
        raise HTTPException(400, "Admin email required")
    
    config = AutomationConfig(
        auto_create_channel=auto_create_channel,
        auto_delegate_admin=auto_delegate_admin,
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
                logger.info(f"💾 Saving Detected Channel ID: {channel_id}")
                profile.channel_id = channel_id
                db.commit()
    
    return results

# --- Captain Endpoints (Hosted under /resources/captain) ---

@router.get("/captain/{profile_id}/channels")
def get_captain_channels(profile_id: str, db: Session = Depends(get_db)):
    """ List BrandChannels owned by this Profile (Captain) """
    # 1. Fetch by owner_profile_id
    channels = db.query(BrandChannel).filter(BrandChannel.owner_profile_id == profile_id).all()
    
    # 2. [Fallback/Migration] If no channels found, check valid CaptainAccount links (Legacy)
    # This is optional, but if we want to support old data:
    # return channels or []
    
    # Format response
    return [
        {
            "id": ch.id,
            "channel_id": ch.channel_id,
            "title": ch.title,
            "thumbnail_url": ch.thumbnail_url,
            "subscriber_count": ch.subscriber_count,
            "video_count": ch.video_count,
            "revenue_text": ch.revenue_text,
            "is_active": ch.is_active
        }
        for ch in channels
    ]

@router.post("/captain/{profile_id}/scan-channels")
async def scan_captain_channels(profile_id: str, db: Session = Depends(get_db)):
    """ 
    Trigger a scan for Brand Channels delegated to this Captain.
    This simulates a scan or triggers a real one if automation is ready.
    For now, we might just associate existing orphan channels or mock it.
    """
    profile = db.query(Profile).filter(Profile.id == profile_id).first()
    if not profile:
        raise HTTPException(404, "Profile not found")

    # [Logic]
    # In a real scenario, we would:
    # 1. Launch browser/automation to Youtube Studio > Permissions
    # 2. Parse delegated channels
    # 3. Update DB (BrandChannel table) setting owner_profile_id = profile_id
    
    # For this iteration, let's look for BrandChannels that match the profile's email (if we stored it)
    # or just return a success message telling user to 'Connect'.
    
    # [Temporary Auto-Link]
    # If the profile has a channel_id set, ensure that BrandChannel exists and is linked
    found_count = 0
    if profile.channel_id:
        existing_ch = db.query(BrandChannel).filter(BrandChannel.channel_id == profile.channel_id).first()
        if existing_ch:
            existing_ch.owner_profile_id = profile_id
            found_count += 1
            db.commit()
        else:
            # Create if missing (Basic)
            new_ch = BrandChannel(
                channel_id=profile.channel_id,
                title="Monitored Channel",
                owner_profile_id=profile_id
            )
            db.add(new_ch)
            db.commit()
            found_count += 1
            
    return {
        "success": True,
        "channels_found": found_count,
        "msg": "스캔 완료 (연결된 채널 확인)"
    }
