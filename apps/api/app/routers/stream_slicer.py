"""
API Router for Zero-Download Stream Slicing and Infinite Cloud Vault.
Provides real-time stream probing, on-the-fly clip slicing, and cloud vault file management.
"""

from fastapi import APIRouter, HTTPException, Query, Body
from fastapi.responses import RedirectResponse, StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import logging
import aiohttp

from app.services.zero_download_slicer import zero_download_slicer
from app.services.telegram_cloud_vault import telegram_cloud_vault

logger = logging.getLogger("stream_slicer_router")

router = APIRouter(prefix="/api/stream-slicer", tags=["Stream Slicer & Cloud Vault"])
vault_router = APIRouter(prefix="/api/cloud-vault", tags=["Telegram Cloud Vault"])


class ProbeRequest(BaseModel):
    url: str = Field(..., description="Douyin, TikTok, YouTube, or HLS/MP4 stream URL")


class SliceRequest(BaseModel):
    source_url: str = Field(..., description="Target video or stream URL")
    start_seconds: float = Field(0.0, description="Start timecode in seconds")
    duration_seconds: float = Field(30.0, description="Duration in seconds (e.g. 30-60s)")
    output_filename: Optional[str] = Field(None, description="Optional custom output filename")


class VaultSliceRequest(BaseModel):
    file_id: str = Field(..., description="Telegram vault file_id")
    start_seconds: float = Field(0.0, description="Start timecode in seconds")
    duration_seconds: float = Field(30.0, description="Duration in seconds")


class VaultRegisterRequest(BaseModel):
    file_id: str
    file_name: str
    file_size_mb: float
    duration_sec: float = 0.0
    category: str = "movie"


# ========================================================
# Stream Slicer Endpoints
# ========================================================

@router.post("/probe")
async def probe_stream(req: ProbeRequest):
    """Probe video metadata from Douyin/TikTok/YouTube/HLS stream without downloading."""
    try:
        info = await zero_download_slicer.extract_stream_urls(req.url)
        return {
            "success": True,
            "title": info.get("title"),
            "duration": info.get("duration"),
            "thumbnail": info.get("thumbnail"),
            "uploader": info.get("uploader"),
            "has_stream": bool(info.get("video_url"))
        }
    except Exception as e:
        logger.error(f"❌ [StreamSlicerAPI] Probe error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/slice")
async def slice_stream(req: SliceRequest):
    """
    On-The-Fly slice a clip directly from remote stream without downloading full media.
    """
    try:
        result = await zero_download_slicer.slice_stream(
            source_url=req.source_url,
            start_seconds=req.start_seconds,
            duration_seconds=req.duration_seconds,
            output_filename=req.output_filename
        )
        return result
    except Exception as e:
        logger.error(f"❌ [StreamSlicerAPI] Slice error: {e}")
        raise HTTPException(status_code=500, detail=f"스트림 슬라이싱 실패: {str(e)}")


# ========================================================
# Telegram Cloud Vault Endpoints
# ========================================================

@vault_router.get("/files")
async def list_vault_files(category: Optional[str] = None):
    """List all massive video assets stored in the Telegram Infinite Cloud Vault."""
    files = await telegram_cloud_vault.list_vault_files(category=category)
    return {"success": True, "files": files, "count": len(files)}


@vault_router.post("/register")
async def register_vault_file(req: VaultRegisterRequest):
    """Register a new video asset uploaded to the Telegram vault channel."""
    try:
        res = await telegram_cloud_vault.register_vault_file(
            file_id=req.file_id,
            file_name=req.file_name,
            file_size_mb=req.file_size_mb,
            duration_sec=req.duration_sec,
            category=req.category
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@vault_router.post("/slice")
async def slice_vault_file(req: VaultSliceRequest):
    """On-The-Fly slice a 30-60s clip directly from a vault movie file without downloading it."""
    try:
        res = await telegram_cloud_vault.slice_vault_file(
            file_id=req.file_id,
            start_seconds=req.start_seconds,
            duration_seconds=req.duration_seconds
        )
        return res
    except Exception as e:
        logger.error(f"❌ [VaultAPI] Slice error: {e}")
        raise HTTPException(status_code=500, detail=f"볼트 영화 슬라이싱 실패: {str(e)}")


@vault_router.get("/stream/{file_id}")
async def stream_vault_file(file_id: str):
    """Proxy streaming endpoint for previewing vault videos directly in the browser."""
    direct_url = await telegram_cloud_vault.get_direct_download_url(file_id)
    if not direct_url:
        raise HTTPException(status_code=404, detail="클라우드 볼트 스트림 주소를 찾을 수 없습니다.")
    # Redirect to direct high-speed CDN URL
    return RedirectResponse(url=direct_url)
