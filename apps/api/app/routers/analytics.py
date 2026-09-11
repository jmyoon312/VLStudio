import logging
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.analytics_service import AnalyticsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["analytics"])

class DiagnoseHookRequest(BaseModel):
    video_id: str
    title: str
    retention_rate_3s: float = 45.0
    retention_rate_5s: float = 30.0
    views: int = 1000

@router.get("/channels")
def get_channel_analytics(
    channel_id: Optional[str] = Query("all"),
    time_range: Optional[str] = Query("monthly"),
    db: Session = Depends(get_db)
):
    """
    채널별/전체 기간별(daily, weekly, monthly, quarterly, yearly) 수익률 및 통계 집계
    """
    try:
        return AnalyticsService.get_channel_analytics(db, channel_id=channel_id, time_range=time_range)
    except Exception as e:
        logger.error(f"Error in get_channel_analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/diagnose-hook")
def diagnose_video_hook(
    req: DiagnoseHookRequest,
    db: Session = Depends(get_db)
):
    """
    저조/대박 영상 후킹 심층 AI 진단 (Single Source of Truth: DB Settings)
    """
    try:
        return AnalyticsService.diagnose_video_with_ai(
            db=db,
            video_id=req.video_id,
            title=req.title,
            retention_rate_3s=req.retention_rate_3s,
            retention_rate_5s=req.retention_rate_5s,
            views=req.views
        )
    except Exception as e:
        logger.error(f"Error in diagnose_video_hook: {e}")
        raise HTTPException(status_code=500, detail=str(e))
