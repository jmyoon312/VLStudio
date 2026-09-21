
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app import models

router = APIRouter(tags=["tiktok_channels"])

# === Schemas ===
class TikTokChannelCreate(BaseModel):
    id: str # username
    browser_profile_id: str
    nickname: Optional[str] = None

class TikTokChannelResponse(BaseModel):
    id: str
    browser_profile_id: str
    nickname: Optional[str]
    status: str
    follower_count: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# === Endpoints ===

@router.get("/", response_model=List[TikTokChannelResponse])
def get_tiktok_channels(db: Session = Depends(get_db)):
    """
    [Single Source of Truth] Profile 테이블(browser_profiles)의 TIKTOK 프로필을
    배포 관리자용 채널 응답으로 변환하여 반환.
    별도 tiktok_channels 테이블은 레거시 — 신규 계정은 모두 Profile 테이블에 저장됨.
    """
    profiles = db.query(models.Profile).filter(
        models.Profile.profile_type == "TIKTOK"
    ).order_by(models.Profile.created_at.desc()).all()

    result = []
    for p in profiles:
        result.append(TikTokChannelResponse(
            id=p.id,
            browser_profile_id=p.id,
            nickname=p.name or p.email or p.id,
            status=p.status or "ACTIVE",
            follower_count=0,
            created_at=p.created_at or datetime.now()
        ))
    return result

@router.delete("/{channel_id}")
def delete_tiktok_channel(channel_id: str, db: Session = Depends(get_db)):
    """
    Profile 테이블 기반 삭제 (소셜 계정 매니저와 동기화).
    레거시 TikTokChannel 테이블에도 동일 ID가 있으면 함께 정리.
    """
    profile = db.query(models.Profile).filter(models.Profile.id == channel_id).first()
    if profile:
        db.delete(profile)
        db.commit()
        return {"message": "Channel deleted", "source": "profile"}

    # 레거시 tiktok_channels 테이블 폴백
    channel = db.query(models.TikTokChannel).filter(models.TikTokChannel.id == channel_id).first()
    if not channel:
        raise HTTPException(404, "Channel not found")
    db.delete(channel)
    db.commit()
    return {"message": "Channel deleted", "source": "legacy"}
