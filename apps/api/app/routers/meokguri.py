"""
ViraLoop Studio - 먹구리형 쇼츠 (Meokguri Shorts) FastAPI 라우터
픽셀링 원천 3대 API(/narration/rewrite, /reference-style/analyze, /tts/jobs) 완벽 대체 및 주권 엔진 연동
"""

from fastapi import APIRouter, HTTPException, Body, Query
from typing import Dict, Any, Optional, List
import logging
from app.services.meokguri_pipeline import (
    analyze_meokguri_pair,
    rewrite_meokguri_narration,
    generate_meokguri_voice,
    process_meokguri_render,
    list_meokguri_jobs,
    list_library_videos
)

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/analyze-pair")
def api_analyze_pair(payload: Dict[str, Any] = Body(...)):
    """클린 원본과 레퍼런스 영상 쌍(Source Pair) ffprobe/ffmpeg 실측 분석"""
    try:
        clean_path = payload.get("cleanOriginalPath")
        clean_url = payload.get("cleanOriginalUrl")
        ref_path = payload.get("editedReferencePath")
        ref_url = payload.get("editedReferenceUrl")

        result = analyze_meokguri_pair(
            clean_path=clean_path,
            clean_url=clean_url,
            ref_path=ref_path,
            ref_url=ref_url
        )
        return result
    except Exception as e:
        logger.error(f"[Meokguri API] Analyze pair error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rewrite-narration")
def api_rewrite_narration(payload: Dict[str, Any] = Body(...)):
    """3대 톤앤매너(cider, warm, hype) 기반 3대 훅 후보(Hook Drafts) 및 대본 리라이팅"""
    try:
        topic = payload.get("topicOrContext", "먹방 ASMR")
        tone = payload.get("tonePreset", "cider")
        duration = int(payload.get("targetDurationSec", 50))
        hook_override = payload.get("hookOverride")

        result = rewrite_meokguri_narration(
            topic_or_context=topic,
            tone_preset=tone,
            target_duration_sec=duration,
            hook_override=hook_override
        )
        return result
    except Exception as e:
        logger.error(f"[Meokguri API] Rewrite narration error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-voice")
def api_generate_voice(payload: Dict[str, Any] = Body(...)):
    """도입부 훅 음성 생성 (ViraLoop 다중 음성 엔진)"""
    try:
        text = payload.get("text", "")
        voice = payload.get("voiceName", "F1")
        speed = float(payload.get("speed", 1.05))
        pitch = int(payload.get("pitch", 0))

        out_path = generate_meokguri_voice(text=text, voice_name=voice, speed=speed, pitch=pitch)
        return {"ok": True, "audioPath": out_path}
    except Exception as e:
        logger.error(f"[Meokguri API] Generate voice error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/render")
def api_render_meokguri(payload: Dict[str, Any] = Body(...)):
    """먹구리형 쇼츠 최종 MP4 렌더링 및 큐 등록"""
    try:
        result = process_meokguri_render(payload)
        return result
    except Exception as e:
        logger.error(f"[Meokguri API] Render error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/jobs")
def api_list_jobs():
    """먹구리형 쇼츠 작업 목록 조회"""
    try:
        return list_meokguri_jobs()
    except Exception as e:
        logger.error(f"[Meokguri API] List jobs error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sample-voice")
def api_sample_voice(
    voiceName: str = Query("F1"),
    speed: float = Query(1.05),
    pitch: int = Query(0)
):
    """ViraLoop 화자별 샘플 음성 미리듣기"""
    try:
        sample_text = "안녕하세요! 먹구리형 쇼츠입니다. 바삭한 소리와 함께 몰입감 넘치는 쇼츠를 만들어보세요!"
        audio_path = generate_meokguri_voice(text=sample_text, voice_name=voiceName, speed=speed, pitch=pitch)
        return {"ok": True, "voiceName": voiceName, "audioPath": audio_path}
    except Exception as e:
        logger.error(f"[Meokguri API] Sample voice error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/library-videos")
def api_list_library_videos():
    """로컬 07_Downloads 및 DB 내 사용 가능한 비디오 목록 탐색"""
    try:
        return list_library_videos()
    except Exception as e:
        logger.error(f"[Meokguri API] List library videos error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
