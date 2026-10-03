"""
Universal Sovereign AI REST API Router
======================================
Exposes full programmatic endpoints for:
1. YouTube Video Deconstruction & Shorts Repurpose Analysis
2. Real-time Live Web Search & Grounding
3. Character Zero-Drift Prompt Continuation
4. Direct Nano Banana Pro / Imagen 3 Image Generation
5. Google Gemini 3.8 Flash Character Multi-Voice Synthesis
"""

from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException

from app.services.gemini_web_agent import gemini_web_agent

router = APIRouter(prefix="/sovereign", tags=["Sovereign Intelligence"])


# ─── Request / Response Schemas ──────────────────────────────────────────────

class YouTubeAnalysisRequest(BaseModel):
    video_url: str = Field(..., description="분석할 유튜브 동영상 URL")
    custom_focus: Optional[str] = Field(None, description="특별 집중 분석 포인트 (선택)")


class LiveSearchRequest(BaseModel):
    query: str = Field(..., description="실시간 검색 및 분석 질의어")
    search_depth: Optional[str] = Field("deep", description="검색 심도 (fast / deep)")


class CharacterPromptRequest(BaseModel):
    character_description: str = Field(..., description="캐릭터 고정 외모/특징")
    scene_action: str = Field(..., description="해당 씬에서의 동작, 표정, 조명")
    base_style: Optional[str] = Field("cinematic_photorealism", description="기본 시각 스타일")


class ImageGenRequest(BaseModel):
    prompt: str = Field(..., description="이미지 생성 프롬프트")
    aspect_ratio: Optional[str] = Field("9:16", description="화면비 (9:16, 16:9, 1:1)")
    style_preset: Optional[str] = Field("cinematic_photorealism", description="스타일 프리셋")


class CharacterVoiceRequest(BaseModel):
    text: str = Field(..., description="합성할 대본 텍스트")
    character_profile: Optional[str] = Field("narrator", description="11대 캐릭터 페르소나")


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.post("/youtube-analysis")
async def analyze_youtube_video(req: YouTubeAnalysisRequest) -> Dict[str, Any]:
    """
    유튜브 영상 URL을 받아 3초 훅 점수, 서사 구조, 바이럴 트리거 및 숏폼 재가공 구간을 분석합니다.
    """
    res = await gemini_web_agent.analyze_youtube_video(
        video_url=req.video_url,
        custom_focus=req.custom_focus
    )
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("error", "영상 분석 실패"))
    return res


@router.post("/live-search")
async def live_web_search(req: LiveSearchRequest) -> Dict[str, Any]:
    """
    구글 실시간 검색 그라운딩을 활용하여 최신 팩트체크와 숏폼 콘텐츠 기획 앵글을 도출합니다.
    """
    res = await gemini_web_agent.live_web_search(
        query=req.query,
        search_depth=req.search_depth or "deep"
    )
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("error", "실시간 검색 실패"))
    return res


@router.post("/character-prompt")
async def generate_character_prompt(req: CharacterPromptRequest) -> Dict[str, Any]:
    """
    Nano Banana Pro 이미지 생성 시 씬 간 캐릭터 외모 왜곡을 원천 방지하는 프롬프트를 생성합니다.
    """
    return await gemini_web_agent.generate_character_continuation_prompt(
        character_description=req.character_description,
        scene_action=req.scene_action,
        base_style=req.base_style or "cinematic_photorealism"
    )


@router.post("/generate-image")
async def generate_image(req: ImageGenRequest) -> Dict[str, Any]:
    """
    Google Gemini 3.1 Flash Image (Nano Banana Pro)로 고화질 이미지를 즉시 생성합니다.
    """
    res = await gemini_web_agent.generate_image(
        prompt=req.prompt,
        aspect_ratio=req.aspect_ratio or "9:16",
        style_preset=req.style_preset or "cinematic_photorealism"
    )
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("error", "이미지 생성 실패"))
    return res


@router.post("/character-voice")
async def synthesize_character_voice(req: CharacterVoiceRequest) -> Dict[str, Any]:
    """
    Google Gemini 3.8 Flash TTS 캐릭터 멀티 보이스 엔진으로 음성을 합성합니다.
    """
    res = await gemini_web_agent.synthesize_character_voice(
        text=req.text,
        character_profile=req.character_profile or "narrator"
    )
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("message", "음성 합성 실패"))
    return res
