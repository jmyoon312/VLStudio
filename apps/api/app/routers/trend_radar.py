"""
ViraLoop Studio: Trend Radar API Router
Endpoints for FSD Autonomous Scouting, Target Channel Deduplication, and Growth Anatomy.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app import models
from app.services.trend_radar import TrendRadarService
from app.services.scout_stream_engine import scout_telemetry, scout_worker, is_blacklisted_content, auto_spider_longform_cluster
from fastapi.responses import StreamingResponse
import json

router = APIRouter(prefix="/trend-radar", tags=["trend-radar"])

class CandidateResponse(BaseModel):
    id: int
    video_id: str
    url: str
    title: str
    channel_title: str
    channel_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    video_type: str
    view_count: int
    like_count: int
    comment_count: int
    velocity_score: float
    outlier_ratio: float
    engagement_rate: float
    published_at: Optional[datetime] = None
    category_id: Optional[int] = None
    match_score: float
    match_reason: Optional[str] = None
    filtered_negative: Optional[str] = None
    status: str
    channel_subscribers: Optional[str] = None
    duration_text: Optional[str] = None
    hook_analysis: Optional[str] = None
    viral_triggers: Optional[str] = None
    adaptation_angle: Optional[str] = None
    sentiment_rate: Optional[float] = 95.0
    created_at: datetime

    class Config:
        from_attributes = True

class ScanRequest(BaseModel):
    category_id: Optional[int] = None
    video_type: Optional[str] = "shorts"
    limit: Optional[int] = 10

class RejectRequest(BaseModel):
    feedback_reason: Optional[str] = None

@router.get("/candidates", response_model=List[CandidateResponse])
@router.get("/candidates/", response_model=List[CandidateResponse], include_in_schema=False)
async def get_candidates(
    status: Optional[str] = Query(None, description="pending, approved, rejected"),
    category_id: Optional[int] = None,
    video_type: Optional[str] = None,
    exclude_langs: Optional[str] = Query("hi,vi,ar,ru", description="Comma-separated blacklisted language codes"),
    include_langs: Optional[str] = Query(None, description="Comma-separated whitelist language codes"),
    min_outlier: Optional[float] = Query(None, description="Minimum outlier viral ratio (e.g. 3.0)"),
    min_views: Optional[int] = Query(None, description="Minimum view count"),
    date_range: Optional[str] = Query(None, description="24h, 7d, 30d, 90d"),
    db: Session = Depends(get_db)
):
    """
    List trend radar candidates with Target Channel Deduplication and Advanced Constraint Matrix.
    """
    total_count = db.query(models.RadarCandidate).count()
    if total_count == 0:
        try:
            await TrendRadarService.scan_and_incubate(db, video_type="shorts", limit=6)
            await TrendRadarService.scan_and_incubate(db, video_type="long", limit=4)
        except Exception as e:
            print(f"[TrendRadar] Auto-seed initial candidates notice: {e}")

    # 1. Fetch all registered target channel names and URLs
    target_channels = db.query(models.Channel).filter(models.Channel.auto_download == True).all()
    target_names = {c.name for c in target_channels if c.name}
    target_urls = {c.url for c in target_channels if c.url}

    query = db.query(models.RadarCandidate)
    if status:
        query = query.filter(models.RadarCandidate.status == status)
    if category_id:
        query = query.filter(models.RadarCandidate.category_id == category_id)
    if video_type:
        query = query.filter(models.RadarCandidate.video_type == video_type)
    if min_outlier:
        query = query.filter(models.RadarCandidate.outlier_ratio >= min_outlier)
    if min_views:
        query = query.filter(models.RadarCandidate.view_count >= min_views)
    if date_range:
        now = datetime.now()
        if date_range == "24h":
            cutoff = now - timedelta(hours=24)
            query = query.filter(models.RadarCandidate.published_at >= cutoff)
        elif date_range == "7d":
            cutoff = now - timedelta(days=7)
            query = query.filter(models.RadarCandidate.published_at >= cutoff)
        elif date_range == "30d":
            cutoff = now - timedelta(days=30)
            query = query.filter(models.RadarCandidate.published_at >= cutoff)
        elif date_range == "90d":
            cutoff = now - timedelta(days=90)
            query = query.filter(models.RadarCandidate.published_at >= cutoff)
    
    all_cands = query.order_by(models.RadarCandidate.created_at.desc()).limit(200).all()
    
    # 2. Parse language blacklist and whitelist
    blacklisted = [l.strip().lower() for l in exclude_langs.split(",") if l.strip()] if exclude_langs else []
    
    # 3. Strict Deduplication + Unicode Language Script Filtering
    clean_candidates = []
    for c in all_cands:
        if c.channel_title in target_names or c.channel_url in target_urls:
            continue
        # Check blacklisted scripts
        if is_blacklisted_content(c.title, c.channel_title, blacklisted):
            continue
        clean_candidates.append(c)

    return clean_candidates[:100]


class FocusCategoryRequest(BaseModel):
    category_name: str

@router.post("/reset-data")
def reset_radar_data(db: Session = Depends(get_db)):
    """Resets all radar candidates and clears telemetry metrics to zero."""
    deleted = db.query(models.RadarCandidate).delete()
    db.commit()
    scout_telemetry.reset()
    return {"success": True, "deleted_count": deleted, "message": "모든 수집 데이터가 0으로 초기화되었습니다."}

@router.post("/worker/start")
def start_scout_worker():
    """Starts the real autonomous scout background worker."""
    scout_worker.start()
    return {"success": True, "status": "running"}

@router.post("/worker/stop")
def stop_scout_worker():
    """Pauses the real autonomous scout background worker."""
    scout_worker.stop()
    return {"success": True, "status": "stopped"}

@router.post("/worker/focus")
def focus_scout_category(req: FocusCategoryRequest):
    """Prioritizes a specific category for immediate scouting."""
    scout_worker.focus_category(req.category_name)
    return {"success": True, "focused_category": req.category_name}

@router.get("/quant-metrics")
def get_quant_metrics():
    """Returns 100% genuine real-time telemetry metrics."""
    return scout_telemetry.get_summary()

@router.get("/stream")
async def stream_quant_metrics():
    """Server-Sent Events (SSE) streaming real telemetry every 1 second."""
    import asyncio
    async def event_generator():
        while True:
            summary = scout_telemetry.get_summary()
            yield f"data: {json.dumps(summary, ensure_ascii=False)}\n\n"
            await asyncio.sleep(1.0)
    return StreamingResponse(event_generator(), media_type="text/event-stream")
