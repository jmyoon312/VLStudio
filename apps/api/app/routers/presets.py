from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from .. import models, schemas, database
from datetime import datetime, time
from concurrent.futures import ThreadPoolExecutor, as_completed
import time as pytime
import random
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/presets", tags=["collection_presets"])

def get_today_midnight():
    now = datetime.now()
    return datetime.combine(now.date(), time.min)

def enrich_preset_with_stats(db: Session, preset: models.CollectionPreset) -> schemas.CollectionPreset:
    today_midnight = get_today_midnight()
    channel_ids = list(preset.channel_ids or [])
    if preset.folder_ids:
        folder_channels = db.query(models.Channel.id).filter(models.Channel.category_id.in_(preset.folder_ids)).all()
        for (cid,) in folder_channels:
            if cid not in channel_ids:
                channel_ids.append(cid)
    
    today_count = 0
    if channel_ids:
        today_count = db.query(models.Video).filter(
            models.Video.channel_id.in_(channel_ids),
            models.Video.downloaded_at >= today_midnight,
            models.Video.status == 'completed'
        ).count()
        
    try:
        p_data = schemas.CollectionPreset.model_validate(preset)
    except AttributeError:
        p_data = schemas.CollectionPreset.from_orm(preset)
    p_data.today_collected_count = today_count
    return p_data

@router.get("", response_model=List[schemas.CollectionPreset])
@router.get("/", response_model=List[schemas.CollectionPreset])
def list_presets(db: Session = Depends(database.get_db)):
    presets = db.query(models.CollectionPreset).order_by(models.CollectionPreset.id.desc()).all()
    return [enrich_preset_with_stats(db, p) for p in presets]

@router.post("", response_model=schemas.CollectionPreset)
@router.post("/", response_model=schemas.CollectionPreset)
def create_preset(preset: schemas.CollectionPresetCreate, db: Session = Depends(database.get_db)):
    new_preset = models.CollectionPreset(
        name=preset.name,
        video_type=preset.video_type,
        upload_period=preset.upload_period,
        min_views=preset.min_views,
        sort_by=preset.sort_by,
        max_videos_per_channel=preset.max_videos_per_channel,
        outlier_ratio=preset.outlier_ratio,
        collect_video=preset.collect_video,
        collect_script=preset.collect_script,
        is_auto_active=preset.is_auto_active,
        cron_interval_hours=preset.cron_interval_hours,
        channel_ids=preset.channel_ids or [],
        folder_ids=preset.folder_ids or [],
    )
    db.add(new_preset)
    db.commit()
    db.refresh(new_preset)
    return enrich_preset_with_stats(db, new_preset)

@router.get("/{preset_id}", response_model=schemas.CollectionPreset)
def get_preset(preset_id: int, db: Session = Depends(database.get_db)):
    preset = db.query(models.CollectionPreset).filter(models.CollectionPreset.id == preset_id).first()
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    return enrich_preset_with_stats(db, preset)

@router.put("/{preset_id}", response_model=schemas.CollectionPreset)
def update_preset(preset_id: int, update_data: schemas.CollectionPresetUpdate, db: Session = Depends(database.get_db)):
    preset = db.query(models.CollectionPreset).filter(models.CollectionPreset.id == preset_id).first()
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    
    data_dict = update_data.dict(exclude_unset=True)
    for key, value in data_dict.items():
        setattr(preset, key, value)
    
    preset.updated_at = datetime.now()
    db.commit()
    db.refresh(preset)
    return enrich_preset_with_stats(db, preset)

@router.delete("/{preset_id}")
def delete_preset(preset_id: int, db: Session = Depends(database.get_db)):
    preset = db.query(models.CollectionPreset).filter(models.CollectionPreset.id == preset_id).first()
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    db.delete(preset)
    db.commit()
    return {"status": "success", "deleted_id": preset_id}

@router.put("/{preset_id}/toggle-active")
def toggle_preset_active(preset_id: int, db: Session = Depends(database.get_db)):
    preset = db.query(models.CollectionPreset).filter(models.CollectionPreset.id == preset_id).first()
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    preset.is_auto_active = not preset.is_auto_active
    preset.updated_at = datetime.now()
    db.commit()
    return {"status": "success", "is_auto_active": preset.is_auto_active}

@router.put("/{preset_id}/channels")
def update_preset_channels(preset_id: int, channel_ids: List[int], db: Session = Depends(database.get_db)):
    preset = db.query(models.CollectionPreset).filter(models.CollectionPreset.id == preset_id).first()
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    preset.channel_ids = channel_ids
    preset.updated_at = datetime.now()
    db.commit()
    return {"status": "success", "channel_ids": preset.channel_ids}

def _scan_channel_worker(cid: int, preset_id: int) -> int:
    """Thread-safe worker: scans channel with its own isolated session and human jitter"""
    from ..database import SessionLocal
    from ..services import channel_monitor
    
    # 0.8 ~ 2.0s human anti-blocking jitter
    pytime.sleep(random.uniform(0.8, 2.0))
    
    worker_db = SessionLocal()
    try:
        ch = worker_db.query(models.Channel).filter(models.Channel.id == cid).first()
        preset = worker_db.query(models.CollectionPreset).filter(models.CollectionPreset.id == preset_id).first()
        if not ch or not preset:
            return 0
        return channel_monitor.scan_channel_with_preset(worker_db, ch, preset)
    except Exception as e:
        logger.error(f"[CONCURRENT SCAN ERROR] Channel ID {cid}: {e}")
        return 0
    finally:
        worker_db.close()

def execute_preset_collection(preset_id: int):
    """
    High-Performance 2-Tier Concurrent Preset Collector.
    Handles dozens to hundreds of channels safely using ThreadPoolExecutor (max_workers=5).
    """
    from ..database import SessionLocal
    
    db = SessionLocal()
    try:
        preset = db.query(models.CollectionPreset).filter(models.CollectionPreset.id == preset_id).first()
        if not preset:
            return
        
        target_channel_ids = list(preset.channel_ids or [])
        if preset.folder_ids:
            folder_channels = db.query(models.Channel.id).filter(models.Channel.category_id.in_(preset.folder_ids)).all()
            for (cid,) in folder_channels:
                if cid not in target_channel_ids:
                    target_channel_ids.append(cid)
        
        if not target_channel_ids:
            logger.info(f"[PRESET] No channels bound to preset '{preset.name}'")
            return
        
        total_channels = len(target_channel_ids)
        logger.info(f"🚀 [PRESET] Starting concurrent collection for '{preset.name}' ({total_channels} channels, Pool=5)")
        
        total_collected = 0
        max_workers = min(5, max(2, total_channels))
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_cid = {
                executor.submit(_scan_channel_worker, cid, preset_id): cid 
                for cid in target_channel_ids
            }
            for future in as_completed(future_to_cid):
                try:
                    count = future.result()
                    total_collected += count
                except Exception as exc:
                    cid = future_to_cid[future]
                    logger.error(f"[PRESET] Channel {cid} scan failed: {exc}")
        
        # Reload preset in main thread and commit stats
        preset = db.query(models.CollectionPreset).filter(models.CollectionPreset.id == preset_id).first()
        if preset:
            preset.last_run_at = datetime.now()
            preset.last_collected_count = total_collected
            db.commit()
            logger.info(f"✅ [PRESET] Finished '{preset.name}'. Total new collected: {total_collected}")
    except Exception as e:
        logger.error(f"[PRESET] Error executing preset {preset_id}: {e}")
    finally:
        db.close()

@router.post("/{preset_id}/run")
def run_preset_now(preset_id: int, background_tasks: BackgroundTasks, db: Session = Depends(database.get_db)):
    preset = db.query(models.CollectionPreset).filter(models.CollectionPreset.id == preset_id).first()
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    
    background_tasks.add_task(execute_preset_collection, preset_id)
    return {"status": "success", "message": f"'{preset.name}' 수집 작업이 백그라운드에서 시작되었습니다."}
