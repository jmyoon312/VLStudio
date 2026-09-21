import os
import uuid
import logging
import pathlib
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models import Profile, ProfileStatus
from app.config import settings
from app.services.stealth_ops_v2 import get_profile_path

logger = logging.getLogger("SocialProfilesRouter")
router = APIRouter(prefix="/social-profiles", tags=["social_profiles"])

# === Schemas ===
class SocialProfileDraftRequest(BaseModel):
    platform: str # 'TIKTOK', 'INSTAGRAM', 'DOUYIN'
    name: Optional[str] = None
    email: Optional[str] = None # username / handle

class SocialProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None # handle / username
    password: Optional[str] = None
    platform: Optional[str] = None # 'TIKTOK', 'INSTAGRAM', 'DOUYIN'
    status: Optional[str] = "ACTIVE"
    proxy_mode: Optional[str] = "DIRECT_LTE" # DIRECT_LTE, ISP_PROXY, DIRECT
    proxy_protocol: Optional[str] = "http"
    proxy_host: Optional[str] = None
    proxy_port: Optional[str] = None
    proxy_username: Optional[str] = None
    proxy_password: Optional[str] = None
    bound_device_serial: Optional[str] = None

class SocialProfileResponse(BaseModel):
    id: str
    name: Optional[str]
    email: Optional[str]
    platform: str
    status: str
    folder_path: Optional[str]
    engine_type: Optional[str]
    proxy_mode: Optional[str]
    proxy_protocol: Optional[str]
    proxy_host: Optional[str]
    proxy_port: Optional[str]
    proxy_username: Optional[str]
    bound_device_serial: Optional[str]
    created_at: Optional[datetime]
    last_used_at: Optional[datetime]

    class Config:
        from_attributes = True

from app.services.stealth_ops_v2 import stealth_ops



# === Endpoints ===

@router.get("/", response_model=List[SocialProfileResponse])
def get_social_profiles(
    platform: Optional[str] = Query(None, description="TIKTOK, INSTAGRAM, DOUYIN"),
    db: Session = Depends(get_db)
):
    query = db.query(Profile).filter(Profile.profile_type.in_(["TIKTOK", "INSTAGRAM", "DOUYIN"]))
    if platform:
        query = query.filter(Profile.profile_type == platform.upper())
    
    profiles = query.order_by(Profile.created_at.desc()).all()
    res = []
    for p in profiles:
        res.append(SocialProfileResponse(
            id=p.id,
            name=p.name,
            email=p.email,
            platform=p.profile_type,
            status=p.status or "ACTIVE",
            folder_path=p.folder_path,
            engine_type=p.engine_type or "cloakbrowser",
            proxy_mode=p.proxy_mode or "DIRECT_LTE",
            proxy_protocol=p.proxy_protocol or "http",
            proxy_host=p.proxy_host,
            proxy_port=p.proxy_port,
            proxy_username=p.proxy_username,
            bound_device_serial=p.bound_device_serial,
            created_at=p.created_at,
            last_used_at=p.last_used_at
        ))
    return res

@router.post("/draft", response_model=SocialProfileResponse)
def create_social_profile_draft(
    req: SocialProfileDraftRequest,
    db: Session = Depends(get_db)
):
    plat = req.platform.upper()
    if plat not in ["TIKTOK", "INSTAGRAM", "DOUYIN"]:
        raise HTTPException(400, f"Unsupported platform: {plat}")

    new_id = f"social_{plat.lower()}_{str(uuid.uuid4())[:8]}"
    profile_base = pathlib.Path(settings.MEDIA_ROOT) / "04_Profiles"
    folder_path = str(profile_base / new_id)
    os.makedirs(folder_path, exist_ok=True)

    default_name = req.name or f"신규 {plat} 계정"
    profile = Profile(
        id=new_id,
        name=default_name,
        email=req.email,
        profile_type=plat,
        usage_type=f"{plat}_MANAGEMENT",
        status=ProfileStatus.DRAFT,
        folder_path=folder_path,
        engine_type="cloakbrowser",
        proxy_mode="DIRECT",
        created_at=datetime.now()
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)

    return SocialProfileResponse(
        id=profile.id,
        name=profile.name,
        email=profile.email,
        platform=profile.profile_type,
        status=profile.status,
        folder_path=profile.folder_path,
        engine_type=profile.engine_type,
        proxy_mode=profile.proxy_mode,
        proxy_protocol=profile.proxy_protocol,
        proxy_host=profile.proxy_host,
        proxy_port=profile.proxy_port,
        proxy_username=profile.proxy_username,
        bound_device_serial=profile.bound_device_serial,
        created_at=profile.created_at,
        last_used_at=profile.last_used_at
    )

@router.put("/{profile_id}", response_model=SocialProfileResponse)
def update_social_profile(
    profile_id: str,
    req: SocialProfileUpdateRequest,
    db: Session = Depends(get_db)
):
    profile = db.query(Profile).filter(Profile.id == profile_id).first()
    if not profile:
        raise HTTPException(404, "Profile not found")

    if req.name is not None: profile.name = req.name
    if req.email is not None: profile.email = req.email
    if req.password is not None: profile.password = req.password
    if req.platform is not None: profile.profile_type = req.platform.upper()
    if req.status is not None: profile.status = req.status
    if req.proxy_mode is not None: profile.proxy_mode = req.proxy_mode
    if req.proxy_protocol is not None: profile.proxy_protocol = req.proxy_protocol
    if req.proxy_host is not None: profile.proxy_host = req.proxy_host
    if req.proxy_port is not None: profile.proxy_port = req.proxy_port
    if req.proxy_username is not None: profile.proxy_username = req.proxy_username
    if req.proxy_password is not None: profile.proxy_password = req.proxy_password
    if req.bound_device_serial is not None: profile.bound_device_serial = req.bound_device_serial

    db.commit()
    db.refresh(profile)

    return SocialProfileResponse(
        id=profile.id,
        name=profile.name,
        email=profile.email,
        platform=profile.profile_type,
        status=profile.status,
        folder_path=profile.folder_path,
        engine_type=profile.engine_type,
        proxy_mode=profile.proxy_mode,
        proxy_protocol=profile.proxy_protocol,
        proxy_host=profile.proxy_host,
        proxy_port=profile.proxy_port,
        proxy_username=profile.proxy_username,
        bound_device_serial=profile.bound_device_serial,
        created_at=profile.created_at,
        last_used_at=profile.last_used_at
    )

@router.post("/{profile_id}/launch")
async def launch_social_browser(
    profile_id: str,
    target_url: Optional[str] = None,
    db: Session = Depends(get_db)
):
    import asyncio
    profile = db.query(Profile).filter(Profile.id == profile_id).first()
    if not profile:
        raise HTTPException(404, "Profile not found")

    # 기본 대상 URL 결정 (플랫폼별)
    if not target_url:
        plat = (profile.profile_type or "").upper()
        if plat == "TIKTOK":
            target_url = "https://www.tiktok.com/creator-center"
        elif plat == "INSTAGRAM":
            target_url = "https://www.instagram.com/"
        elif plat == "DOUYIN":
            target_url = "https://creator.douyin.com/"
        else:
            target_url = "https://www.tiktok.com/creator-center"

    # ─── LTE 플랫폼 충돌 인터락 ───────────────────────────────────────────────
    # 같은 폰(bound_device_serial)에서 DIRECT_LTE 모드로 운영 중,
    # ByteDance 동일 계열(TikTok↔Douyin)이 5분 이내 활성 중이면 순차 처리 안내
    PLATFORM_COMPANY = {
        "TIKTOK":    "bytedance",
        "DOUYIN":    "bytedance",
        "INSTAGRAM": "meta",
        "YOUTUBE":   "google",
    }
    if profile.proxy_mode == "DIRECT_LTE" and profile.bound_device_serial:
        same_device_profiles = db.query(Profile).filter(
            Profile.bound_device_serial == profile.bound_device_serial,
            Profile.id != profile_id,
            Profile.profile_type.in_(["TIKTOK", "DOUYIN", "INSTAGRAM"])
        ).all()
        my_company = PLATFORM_COMPANY.get((profile.profile_type or "").upper(), "unknown")
        for other in same_device_profiles:
            other_company = PLATFORM_COMPANY.get((other.profile_type or "").upper(), "unknown")
            if other_company == my_company and other_company != "unknown" and other.last_used_at:
                if (datetime.now() - other.last_used_at).total_seconds() < 300:  # 5분 이내
                    logger.warning(
                        f"⚠️ LTE 충돌 감지: {profile.profile_type}/{profile.id} ↔ "
                        f"{other.profile_type}/{other.id} — 동일 회사({other_company}) 5분 내 사용 중"
                    )
                    return {
                        "status": "queued",
                        "message": (
                            f"⚠️ {other.name}({other.profile_type})이 동일 {other_company.upper()} "
                            f"계열로 LTE를 사용 중입니다.\n"
                            f"ByteDance 동시 LTE 접속은 계정 보안 위험이 있으므로 순차 처리됩니다.\n"
                            f"약 {max(0, 5 - int((datetime.now() - other.last_used_at).total_seconds() / 60))}분 "
                            f"후 재시도하거나, 대기열에서 순차 실행해 주세요."
                        ),
                        "conflict_profile_id": other.id,
                        "conflict_profile_name": other.name,
                        "conflict_platform": other.profile_type,
                        "profile_id": profile_id,
                    }
    # ─────────────────────────────────────────────────────────────────────────

    logger.info(f"🚀 [소셜 보안접속] {profile.profile_type} → {target_url} (proxy_mode: {profile.proxy_mode})")

    # stealth_ops.launch_for_setup()은 psutil 스캔 + ADB 블로킹 호출 포함
    # → 반드시 스레드풀에서 실행해야 이벤트 루프가 블로킹되지 않음
    loop = asyncio.get_event_loop()
    success = await loop.run_in_executor(
        None,
        lambda: stealth_ops.launch_for_setup(
            profile_id=profile_id,
            email=profile.email,
            password=profile.password,
            skip_proxy_check=False,
            db=db,
            rotate_ip_on_close=False,
            target_url=target_url
        )
    )

    if success:
        profile.last_used_at = datetime.now()
        db.commit()
        return {
            "status": "launched",
            "message": f"🛡️ {profile.name} 스텔스 보안 브라우저가 실행되었습니다.",
            "profile_id": profile.id,
            "target_url": target_url,
        }
    else:
        raise HTTPException(500, "브라우저 실행 실패: backend logs 확인")

@router.delete("/{profile_id}")
def delete_social_profile(
    profile_id: str,
    delete_folder: bool = True,
    db: Session = Depends(get_db)
):
    profile = db.query(Profile).filter(Profile.id == profile_id).first()
    if not profile:
        raise HTTPException(404, "Profile not found")

    folder_path = profile.folder_path
    db.delete(profile)
    db.commit()

    if delete_folder and folder_path and os.path.exists(folder_path):
        import shutil
        try:
            shutil.rmtree(folder_path, ignore_errors=True)
            logger.info(f"Deleted profile directory: {folder_path}")
        except Exception as e:
            logger.warning(f"Failed to delete directory {folder_path}: {e}")

    return {"status": "deleted", "profile_id": profile_id}
