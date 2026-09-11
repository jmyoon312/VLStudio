import os
from pathlib import Path
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException

from app.services.media_intelligence.core import media_intelligence

router = APIRouter(prefix="/media-intelligence", tags=["Media Intelligence"])


class AnalyzeVideoRequest(BaseModel):
    video_path: str = Field(..., description="분석할 동영상 파일의 로컬 절대 경로")
    work_dir: Optional[str] = Field(None, description="분석 작업 디렉토리 (선택)")
    purpose: Optional[str] = Field("subtitle", description="분석 목적 (subtitle: 시각 액션/사건 중심, layout_dna: 레이아웃 역공학)")


class AnalyzeVideoResponse(BaseModel):
    success: bool
    manifest: Dict[str, Any]
    error: Optional[str] = None


class ChannelDNARequest(BaseModel):
    video_path: str = Field(..., description="분석할 레퍼런스 영상 절대 경로")
    work_dir: Optional[str] = Field(None, description="작업 디렉토리 (선택)")


class ChannelDNAResponse(BaseModel):
    success: bool
    blueprint: Dict[str, Any]
    error: Optional[str] = None


class LongformHighlightsRequest(BaseModel):
    video_path: str = Field(..., description="분석할 롱폼 영상 절대 경로")
    target_clips: Optional[int] = Field(3, description="검출할 하이라이트 클립 수")
    min_duration: Optional[float] = Field(15.0, description="클립 최소 길이(초)")
    max_duration: Optional[float] = Field(60.0, description="클립 최대 길이(초)")


class LongformHighlightsResponse(BaseModel):
    success: bool
    highlights: list
    error: Optional[str] = None


@router.post("/analyze", response_model=AnalyzeVideoResponse)
async def analyze_video(request: AnalyzeVideoRequest):
    vpath = Path(request.video_path)
    if not vpath.exists():
        raise HTTPException(status_code=404, detail=f"지정된 비디오 파일이 존재하지 않습니다: {request.video_path}")

    work_dir = Path(request.work_dir) if request.work_dir else None

    try:
        manifest = await media_intelligence.generate_video_manifest(
            vpath,
            work_dir=work_dir,
            purpose=request.purpose or "subtitle"
        )
        return AnalyzeVideoResponse(
            success=True,
            manifest=manifest
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"미디어 인텔리전스 분석 실패: {str(e)}")


@router.post("/channel-dna", response_model=ChannelDNAResponse)
async def extract_channel_dna(request: ChannelDNARequest):
    vpath = Path(request.video_path)
    if not vpath.exists():
        raise HTTPException(status_code=404, detail=f"지정된 비디오 파일이 존재하지 않습니다: {request.video_path}")

    work_dir = Path(request.work_dir) if request.work_dir else None

    try:
        blueprint = await media_intelligence.extract_channel_dna_blueprint(vpath, work_dir=work_dir)
        return ChannelDNAResponse(
            success=True,
            blueprint=blueprint
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"채널 DNA 블루프린트 추출 실패: {str(e)}")


@router.post("/highlights", response_model=LongformHighlightsResponse)
async def extract_highlights(request: LongformHighlightsRequest):
    vpath = Path(request.video_path)
    if not vpath.exists():
        raise HTTPException(status_code=404, detail=f"지정된 비디오 파일이 존재하지 않습니다: {request.video_path}")

    try:
        clips = await media_intelligence.extract_longform_highlights(
            vpath,
            target_clips=request.target_clips or 3,
            min_duration=request.min_duration or 15.0,
            max_duration=request.max_duration or 60.0
        )
        return LongformHighlightsResponse(
            success=True,
            highlights=clips
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"롱폼 VMI 하이라이트 검출 실패: {str(e)}")

