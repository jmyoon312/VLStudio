import logging
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.community_service import CommunityService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/community", tags=["community"])

class GenerateReplyRequest(BaseModel):
    comment_id: str
    persona: str = "friendly"  # friendly, witty, expert

class PostReplyRequest(BaseModel):
    comment_id: str
    custom_reply: Optional[str] = None

@router.get("/comments")
def list_comments(
    channel_id: Optional[str] = Query(None),
    sentiment: Optional[str] = Query(None),
    is_replied: Optional[bool] = Query(None),
    limit: int = Query(50),
    db: Session = Depends(get_db)
):
    """
    유튜브 댓글 목록 조회 및 필터링
    """
    try:
        return CommunityService.list_comments(
            db=db,
            channel_id=channel_id,
            sentiment=sentiment,
            is_replied=is_replied,
            limit=limit
        )
    except Exception as e:
        logger.error(f"Error in list_comments: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-reply")
def generate_reply(
    req: GenerateReplyRequest,
    db: Session = Depends(get_db)
):
    """
    루피 AI를 통한 채널 페르소나 맞춤형 답글 생성
    """
    try:
        return CommunityService.generate_ai_reply(
            db=db,
            comment_id=req.comment_id,
            persona=req.persona
        )
    except Exception as e:
        logger.error(f"Error in generate_reply: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/post-reply")
def post_reply(
    req: PostReplyRequest,
    db: Session = Depends(get_db)
):
    """
    작성된 AI 답글 게시 완료 처리
    """
    try:
        return CommunityService.post_reply(
            db=db,
            comment_id=req.comment_id,
            custom_reply=req.custom_reply
        )
    except Exception as e:
        logger.error(f"Error in post_reply: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class AutopilotConfigRequest(BaseModel):
    channel_id: str = "all"
    is_autonomous_enabled: Optional[bool] = None
    autopilot_mode: Optional[str] = None  # SAFE_AUTO, FULL_AUTO, MANUAL_REVIEW
    persona: Optional[str] = None  # friendly, witty, expert

class AutopilotRunRequest(BaseModel):
    channel_id: Optional[str] = None

class AutopilotToggleRequest(BaseModel):
    enabled: Optional[bool] = None

@router.get("/autopilot/status")
def get_autopilot_status(db: Session = Depends(get_db)):
    """
    루피 AI 커뮤니티 사령탑 상태 및 채널별 설정 조회
    """
    try:
        return CommunityService.get_autopilot_status(db)
    except Exception as e:
        logger.error(f"Error in get_autopilot_status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/autopilot/run-now")
def run_autopilot_now(
    req: Optional[AutopilotRunRequest] = None,
    db: Session = Depends(get_db)
):
    """
    루피 AI 워커 즉시 1회 가동: 지정 채널(또는 전체)의 미답변 댓글 분석 및 자동 답글 처리
    """
    try:
        target_ch = req.channel_id if req else None
        return CommunityService.run_autopilot_cycle(db, target_channel_id=target_ch)
    except Exception as e:
        logger.error(f"Error in run_autopilot_now: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/autopilot/channel-config")
def set_autopilot_config(
    req: AutopilotConfigRequest,
    db: Session = Depends(get_db)
):
    """
    채널별 루피 AI 자동 댓글 정책 설정
    """
    try:
        return CommunityService.set_channel_autopilot_config(
            db=db,
            channel_id=req.channel_id,
            is_autonomous_enabled=req.is_autonomous_enabled,
            autopilot_mode=req.autopilot_mode,
            persona=req.persona
        )
    except Exception as e:
        logger.error(f"Error in set_autopilot_config: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/autopilot/toggle")
def toggle_autopilot(
    req: Optional[AutopilotToggleRequest] = None,
    db: Session = Depends(get_db)
):
    """
    루피 커뮤니티 오토파일럿 전역 활성화 토글
    """
    try:
        enabled = req.enabled if req else None
        return CommunityService.toggle_autopilot(db, enabled=enabled)
    except Exception as e:
        logger.error(f"Error in toggle_autopilot: {e}")
        raise HTTPException(status_code=500, detail=str(e))

