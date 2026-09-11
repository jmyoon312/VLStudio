"""
쇼츠 제작 스튜디오(Shorts Production Studio) 전용 백엔드 라우터
- 36종 쇼츠 전문 SFX 카탈로그 조회 및 AI 키워드 자동 매핑
- 템플릿 바인딩 기반 일괄 쇼츠 생산 작업(Batch Job) 발주 및 상태 추적
- 3대 인풋 트랙(클립 분할, 대본+더빙, 자막 모션) 연계
"""
import os
import json
import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel

from app.services.sfx_library_service import SFXLibraryService, SFX_CATALOG
from app.services.channel_dna_service import ChannelDNAService

router = APIRouter(prefix="/api/shorts-production", tags=["Shorts Production Studio"])
logger = logging.getLogger(__name__)

# 인메모리 작업 큐 (실제 실행 시 WorkQueue 및 Remotion과 연동)
PRODUCTION_JOBS: List[Dict[str, Any]] = []

class AutoMatchSfxRequest(BaseModel):
    text: str
    placement_type: str = "subtitle"

class BatchProductionJobRequest(BaseModel):
    template_id: Optional[str] = None
    brand_channel_name: Optional[str] = None
    production_mode: str = "batch" # 'single' | 'batch'
    input_track: str = "all_in_one" # 'clip_cut' | 'script_dub' | 'subtitle_motion' | 'all_in_one'
    video_sources: List[str] # URLs or local paths
    script_prompt: Optional[str] = None
    # 5대 고급 연출 옵션
    enable_silence_cut: bool = True
    silence_threshold_ms: int = 300
    enable_auto_face_track: bool = True
    enable_auto_sfx: bool = True
    selected_sfx_categories: List[str] = ["impact", "whoosh", "humor", "money", "alert", "suspense"]
    enable_audio_ducking: bool = True
    ducking_db: float = -18.0
    camera_motion: str = "punch_zoom" # 'none' | 'punch_zoom' | 'ken_burns' | 'shake'
    transition_effect: str = "zoom_blur" # 'none' | 'zoom_blur' | 'glitch' | 'whip_pan' | 'flash'
    watermark_text: Optional[str] = None

@router.get("/sfx")
async def list_sfx(category: Optional[str] = Query(None)):
    """36종 전문 SFX 목록 반환"""
    svc = SFXLibraryService.get_instance()
    return {
        "success": True,
        "total": len(SFX_CATALOG),
        "items": svc.list_sfx(category)
    }

@router.post("/sfx/match")
async def match_sfx(req: AutoMatchSfxRequest):
    """대본 문장에 어울리는 SFX AI 자동 추천"""
    svc = SFXLibraryService.get_instance()
    matched = svc.auto_match_sfx_for_text(req.text, req.placement_type)
    return {
        "success": True,
        "matched_sfx": matched
    }

@router.get("/templates")
async def get_available_templates():
    """제작에 즉시 적용 가능한 템플릿 목록 반환"""
    templates = ChannelDNAService.list_templates()
    return {
        "success": True,
        "items": templates
    }

@router.post("/batch-job")
async def create_batch_production_job(req: BatchProductionJobRequest):
    """터보 일괄 쇼츠 생산 작업 발주"""
    import uuid
    from datetime import datetime

    job_id = f"prod_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"
    
    new_job = {
        "job_id": job_id,
        "created_at": datetime.now().isoformat(),
        "status": "processing",
        "progress": 15,
        "template_id": req.template_id,
        "brand_channel_name": req.brand_channel_name,
        "production_mode": req.production_mode,
        "input_track": req.input_track,
        "total_videos": len(req.video_sources),
        "completed_videos": 0,
        "video_sources": req.video_sources,
        "settings": {
            "silence_cut": req.enable_silence_cut,
            "auto_face_track": req.enable_auto_face_track,
            "auto_sfx": req.enable_auto_sfx,
            "audio_ducking": req.enable_audio_ducking,
            "camera_motion": req.camera_motion,
            "transition": req.transition_effect
        },
        "output_files": []
    }
    
    PRODUCTION_JOBS.insert(0, new_job)
    return {
        "success": True,
        "job_id": job_id,
        "message": f"{len(req.video_sources)}편의 쇼츠 제작 작업이 큐에 성공적으로 등록되었습니다."
    }

@router.get("/jobs")
async def list_production_jobs():
    """현재 쇼츠 제작 큐 작업 목록 반환"""
    return {
        "success": True,
        "items": PRODUCTION_JOBS[:20]
    }
