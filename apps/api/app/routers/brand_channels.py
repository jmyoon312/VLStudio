from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from .. import database, models, schemas
from googleapiclient.discovery import build
from .auth import decrypt_token, ENCRYPTION_KEY # Import helper functions
from cryptography.fernet import Fernet
import json

router = APIRouter(tags=["brand-channels"])

@router.get("/", response_model=List[schemas.BrandChannel])
def get_brand_channels(db: Session = Depends(database.get_db)):
    # Only return active channels by default
    return db.query(models.BrandChannel).filter(models.BrandChannel.is_active == True).all()

@router.delete("/{channel_id}")
def delete_brand_channel(channel_id: int, db: Session = Depends(database.get_db)):
    channel = db.query(models.BrandChannel).filter(models.BrandChannel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Brand Channel not found")
    
    # Soft delete
    channel.is_active = False 
    db.commit()
    return {"ok": True}

@router.patch("/{channel_id}", response_model=schemas.BrandChannel)
def update_brand_channel(channel_id: int, update: schemas.BrandChannelUpdate, db: Session = Depends(database.get_db)):
    channel = db.query(models.BrandChannel).filter(models.BrandChannel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Brand Channel not found")
    
    if update.default_privacy is not None:
        channel.default_privacy = update.default_privacy
    if update.default_tags is not None:
        channel.default_tags = update.default_tags
    if update.growth_phase is not None:
        channel.growth_phase = update.growth_phase
        
    # [UPDATED] Stealth Protocol
    if hasattr(update, 'tin_can_account_id') and update.tin_can_account_id is not None:
        channel.tin_can_account_id = update.tin_can_account_id
    if hasattr(update, 'captain_account_id') and update.captain_account_id is not None:
        channel.captain_account_id = update.captain_account_id
        
    # [NEW] 3-Tier Sovereign Factory Slots
    if hasattr(update, 'assigned_combo_model') and update.assigned_combo_model is not None:
        channel.assigned_combo_model = update.assigned_combo_model
    if hasattr(update, 'daily_target_count') and update.daily_target_count is not None:
        channel.daily_target_count = update.daily_target_count
    if hasattr(update, 'director_state') and update.director_state is not None:
        channel.director_state = update.director_state
        
    db.commit()
    db.refresh(channel)
    return channel


class ChannelLaunchpadReq(BaseModel):
    title: str
    reference_url: Optional[str] = None
    assigned_combo_model: str = "viraloop-fast"
    primary_workflow_mode: str = "keyword_only"
    autonomy_level: str = "LEVEL_2"  # LEVEL_1, LEVEL_2, LEVEL_3
    auto_publish_threshold: int = 90
    daily_target_count: int = 2
    persona_style: Optional[str] = "도파민 후킹 & 0.8초 쨉쨉이 어투"
    forbidden_words: Optional[List[str]] = None

@router.post("/launchpad/clone")
def clone_and_launch_channel(
    req: ChannelLaunchpadReq,
    db: Session = Depends(database.get_db)
):
    """
    [Channel Auto-Launchpad] 원스톱 레퍼런스 복제 & 2단계 관리자(ChannelDirector) 즉시 임명 엔드포인트
    """
    import time
    channel_uid = f"ch_auto_{int(time.time())}"
    forbidden = req.forbidden_words or ["비방", "가짜뉴스", "선정성", "유해단어"]
    
    # 1. 6-Layer Style Signature
    style_sig = {
        "persona": {
            "tone_style": req.persona_style or "도파민 후킹 & 0.8초 쨉쨉이 어투",
            "speech_speed_wpm": 180,
            "forbidden_words": forbidden,
            "clean_shield": True,
            "required_ending_hook": "구독하고 매일 떡상 비밀 받아보세요!"
        },
        "script_branch": {
            "mode": "9_wave_viral",
            "pacing_jab_interval_sec": 0.8,
            "climax_second": 45,
            "active_typography_mix": ["yellow_bold_punch", "impact_red"]
        },
        "audio": {
            "engine": "multitts",
            "voice_id": "ko-KR-SunHiNeural",
            "speed_rate": "+18%",
            "pitch_adjust": "+4Hz",
            "bgm_ducking_db": -18,
            "sfx_pack_name": "whoosh_punch_bell"
        },
        "visual": {
            "engine": "google_flow",
            "aspect_ratio": "9:16",
            "lighting_style": "cinematic_dramatic",
            "seed_lock_enabled": True
        },
        "gatekeeper": {
            "min_pass_score": 85,
            "autonomy_threshold": req.auto_publish_threshold,
            "autonomy_level": req.autonomy_level
        }
    }
    
    # 2. Create BrandChannel
    new_ch = models.BrandChannel(
        channel_id=channel_uid,
        title=req.title,
        thumbnail_url="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=60",
        assigned_combo_model=req.assigned_combo_model,
        primary_workflow_mode=req.primary_workflow_mode,
        autonomy_level=req.autonomy_level,
        auto_publish_threshold=req.auto_publish_threshold,
        daily_target_count=req.daily_target_count,
        director_state="IDLE",
        style_signature=style_sig,
        expert_identity={
            "niche": req.title,
            "tone": req.persona_style,
            "forbidden_words": forbidden,
            "reference_url": req.reference_url
        },
        is_active=True,
        is_autonomous_enabled=True,
        director_heartbeat=datetime.now()
    )
    
    db.add(new_ch)
    db.commit()
    db.refresh(new_ch)
    
    # 3. Create Clone Preset in agent router if table exists
    try:
        from app.routers.agent_router import set_channel_clone_preset
        set_channel_clone_preset(new_ch.id, style_sig)
    except Exception:
        pass
        
    return {
        "success": True,
        "message": f"'{req.title}' 채널과 2단계 관리자(ChannelDirector)가 성공적으로 임명되어 가동을 시작했습니다!",
        "channel": {
            "id": new_ch.id,
            "channel_id": new_ch.channel_id,
            "title": new_ch.title,
            "assigned_combo_model": new_ch.assigned_combo_model,
            "autonomy_level": new_ch.autonomy_level,
            "director_state": new_ch.director_state,
            "daily_target_count": new_ch.daily_target_count
        }
    }

# === [Tier 1 & Tier 2 Director Endpoints] ===

@router.get("/directors/status")
def get_directors_status(db: Session = Depends(database.get_db)):
    from app.services.channel_director import ChannelDirector
    return ChannelDirector.get_all_directors_status(db)

@router.get("/directors/arbiter-status")
def get_arbiter_status():
    from app.services.global_arbiter import global_arbiter
    return global_arbiter.get_status()

@router.post("/directors/kill-switch")
def toggle_kill_switch(active: bool):
    from app.services.global_arbiter import global_arbiter
    success = global_arbiter.set_kill_switch(active)
    return {"success": success, "kill_switch_active": active}

@router.post("/{channel_id}/director/cycle")
async def trigger_director_cycle(channel_id: int, modality: str = "keyword_only", topic: Optional[str] = None):
    from app.services.channel_director import ChannelDirector
    res = await ChannelDirector.step_channel_cycle(channel_id, modality=modality, topic=topic)
    return res

# [DEPRECATED] Worker Sync logic removed in Stealth Protocol.
# New auth flow will be handled via TinCanWizard and specific Resource endpoints.

from fastapi import BackgroundTasks
from app.services.stealth_ops_v2 import stealth_ops  # [UPDATED] Use v2
from datetime import datetime

@router.post("/{channel_id}/warmup")
def trigger_channel_warmup(
    channel_id: str, 
    background_tasks: BackgroundTasks, 
    stage: int = 1,
    captain_id: str = None, # [Optional] context for fallback search
    db: Session = Depends(database.get_db)
):
    """
    [Incubator] Trigger automated warmup routine for a specific Brand Channel.
    - Uses assigned Captain Profile.
    - Runs in background (StealthOps).
    """
    # [Fix] Query by channel_id (string UC...) instead of DB ID (int) for robustness
    print(f"DEBUG: Requesting Warmup for channel_id='{channel_id}' captain_id='{captain_id}'")
    
    channel = db.query(models.BrandChannel).filter(models.BrandChannel.channel_id == channel_id).first()
    
    # [Fallback 1] specific owner search (matches list_captain_channels logic)
    if not channel and captain_id:
        print(f"[WARN] Direct lookup failed. Trying owner-based lookup for captain_id='{captain_id}'...")
        owner_channels = db.query(models.BrandChannel).filter(models.BrandChannel.owner_profile_id == captain_id).all()
        for ch in owner_channels:
             # loose match
            if ch.channel_id == channel_id:
                channel = ch
                print("   -> Match found via owner list (Exact)!")
                break
            if ch.channel_id.strip() == channel_id.strip():
                channel = ch
                print("   -> Match found via owner list (Strip)!")
                break
    
    # [Fallback 2] Full Scan (Last Resort)
    if not channel:
        print(f"[WARN] Owner lookup failed. checking ALL channels...")
        all_channels = db.query(models.BrandChannel).all()
        for ch in all_channels:
            if ch.channel_id == channel_id:
                channel = ch
                break
            if ch.channel_id.strip() == channel_id.strip():
                channel = ch
                break
                
    if not channel:
        print("[FAIL] Still not found after ALL scans.")
        raise HTTPException(status_code=404, detail=f"Brand Channel '{channel_id}' not found. Check server logs.")
        
    if not channel.captain_account:
        raise HTTPException(status_code=400, detail="No Captain assigned to this channel.")
    
    # Update Status
    channel.warmup_status = "RUNNING"
    channel.warmup_last_run = datetime.now()
    if stage > 0:
        channel.warmup_stage = stage
    db.commit()
    
    # Wrapper for Background Task to handle DB updates on completion
    def _warmup_task_wrapper(profile_id, channel_title, db_id, stage_num):
        success = stealth_ops.run_warmup_routine(profile_id, channel_title, stage_num)
        
        # New DB Session for background thread
        from app.database import SessionLocal
        bg_db = SessionLocal()
        try:
            bg_ch = bg_db.query(models.BrandChannel).filter(models.BrandChannel.id == db_id).first()
            if bg_ch:
                bg_ch.warmup_status = "COMPLETED" if success else "FAILED"
                bg_db.commit()
        except Exception as e:
            print(f"Failed to update warmup status: {e}")
        finally:
            bg_db.close()

    # Launch Background Task
    background_tasks.add_task(
        _warmup_task_wrapper, 
        str(channel.captain_account.id), 
        channel.title,
        channel.id,
        stage
    )
    
    return {"status": "Warmup Started", "stage": stage, "captain": channel.captain_account.id}