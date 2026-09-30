# -*- coding: utf-8 -*-
"""
Video Director API Router for ViraLoop Studio
Provides endpoints for Hermes / Conversational Director & MCP Server:
- One-click end-to-end video creation
- Surgical incremental re-rendering (subtitles, voice, jab, media, BGM)
"""

import os
import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

import uuid
import time
from datetime import datetime
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.services.sovereign_video_director import sovereign_video_director

router = APIRouter(prefix="/video-director", tags=["video_director"])

class CreateVideoRequest(BaseModel):
    project_id: Optional[str] = None
    title: str = "바이럴 쇼츠 프로젝트"
    script: str
    scenes: Optional[List[Dict[str, Any]]] = None
    voice_config: Optional[Dict[str, Any]] = None
    subtitles: Optional[List[Dict[str, Any]]] = None
    jab_overlay: Optional[Dict[str, Any]] = None
    branding: Optional[Dict[str, Any]] = None
    audio_config: Optional[Dict[str, Any]] = None
    style_preset: str = "shorts"
    auto_render: bool = True

class ModifySubtitlesRequest(BaseModel):
    project_id: str
    subtitles: List[Dict[str, Any]]
    style_preset: Optional[str] = None

class ModifyVoiceRequest(BaseModel):
    project_id: str
    voice_config: Dict[str, Any]
    new_script: Optional[str] = None

class ModifyJabRequest(BaseModel):
    project_id: str
    jab_overlay: Dict[str, Any]

class ModifyMediaRequest(BaseModel):
    project_id: str
    scene_id: str
    new_media_path: str
    media_type: str = "image"

class ModifyBgmRequest(BaseModel):
    project_id: str
    bgm_path: str
    bgm_volume: float = 0.22

@router.post("/create")
async def create_and_render_video(req: CreateVideoRequest):
    project_id = req.project_id or f"proj_{uuid.uuid4().hex[:8]}"
    sb = await sovereign_video_director.init_or_update_project(
        project_id=project_id,
        title=req.title,
        script=req.script,
        scenes=req.scenes,
        voice_config=req.voice_config,
        subtitles=req.subtitles,
        jab_overlay=req.jab_overlay,
        branding=req.branding,
        audio_config=req.audio_config,
        style_preset=req.style_preset,
    )

    if req.auto_render:
        render_res = await sovereign_video_director.render_project(project_id)
        return {
            "success": render_res.get("success", False),
            "project_id": project_id,
            "video_path": render_res.get("video_path"),
            "duration_seconds": render_res.get("duration_seconds"),
            "storyboard": render_res.get("storyboard") or sb,
            "error": render_res.get("error")
        }
    return {
        "success": True,
        "project_id": project_id,
        "storyboard": sb
    }

@router.post("/modify-subtitles")
async def modify_subtitles(req: ModifySubtitlesRequest):
    res = await sovereign_video_director.modify_subtitles(
        project_id=req.project_id,
        new_subtitles=req.subtitles,
        style_preset=req.style_preset
    )
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("error", "Subtitles modification failed"))
    return res

@router.post("/modify-voice")
async def modify_voice(req: ModifyVoiceRequest):
    res = await sovereign_video_director.modify_voice(
        project_id=req.project_id,
        voice_updates=req.voice_config,
        new_script=req.new_script
    )
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("error", "Voice modification failed"))
    return res

@router.post("/modify-jab")
async def modify_jab(req: ModifyJabRequest):
    res = await sovereign_video_director.modify_jab(
        project_id=req.project_id,
        jab_updates=req.jab_overlay
    )
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("error", "Jab modification failed"))
    return res

@router.post("/modify-media")
async def modify_media(req: ModifyMediaRequest):
    res = await sovereign_video_director.modify_scene_media(
        project_id=req.project_id,
        scene_id=req.scene_id,
        new_media_path=req.new_media_path,
        media_type=req.media_type
    )
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("error", "Media modification failed"))
    return res

@router.post("/modify-bgm")
async def modify_bgm(req: ModifyBgmRequest):
    res = await sovereign_video_director.modify_bgm(
        project_id=req.project_id,
        bgm_path=req.bgm_path,
        bgm_volume=req.bgm_volume
    )
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("error", "BGM modification failed"))
    return res

@router.get("/project/{project_id}")
def get_project(project_id: str):
    sb = sovereign_video_director.load_storyboard(project_id)
    if not sb:
        raise HTTPException(status_code=404, detail="Project not found")
    return {
        "success": True,
        "project_id": project_id,
        "storyboard": sb
    }

class AutoSyncPeaksRequest(BaseModel):
    project_id: str
    auto_render: bool = True

class RegenerateScenesRequest(BaseModel):
    project_id: str
    scene_indices: Optional[List[int]] = None
    prompt_overrides: Optional[Dict[int, str]] = None
    auto_render: bool = True

class ApplyFormatPresetRequest(BaseModel):
    project_id: str
    preset_name: str
    auto_render: bool = True

class RippleDeleteSceneRequest(BaseModel):
    project_id: str
    scene_index: int
    auto_render: bool = True

class PlanCutdownRequest(BaseModel):
    subtitles: List[Dict[str, Any]]
    target_duration_sec: float = 55.0
    style: str = "hook"

@router.post("/auto-sync-peaks")
async def auto_sync_peaks(req: AutoSyncPeaksRequest):
    res = await sovereign_video_director.auto_sync_audio_peaks(
        project_id=req.project_id,
        auto_re_render=req.auto_render
    )
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("error", "Peak sync failed"))
    return res

@router.post("/regenerate-scenes")
async def regenerate_scenes(req: RegenerateScenesRequest):
    res = await sovereign_video_director.regenerate_weak_scenes(
        project_id=req.project_id,
        scene_indices=req.scene_indices,
        prompt_overrides=req.prompt_overrides,
        auto_re_render=req.auto_render
    )
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("error", "Regenerate scenes failed"))
    return res

@router.post("/apply-format-preset")
async def apply_format_preset(req: ApplyFormatPresetRequest):
    res = await sovereign_video_director.apply_format_preset(
        project_id=req.project_id,
        preset_name=req.preset_name,
        auto_re_render=req.auto_render
    )
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("error", "Apply preset failed"))
    return res

@router.post("/ripple-delete-scene")
async def ripple_delete_scene(req: RippleDeleteSceneRequest):
    res = await sovereign_video_director.ripple_delete_scene(
        project_id=req.project_id,
        scene_index=req.scene_index,
        auto_re_render=req.auto_render
    )
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("error", "Ripple delete failed"))
    return res

@router.post("/plan-cutdown")
def plan_cutdown(req: PlanCutdownRequest):
    res = sovereign_video_director.plan_cutdown(
        subtitles=req.subtitles,
        target_duration_sec=req.target_duration_sec,
        style=req.style
    )
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Plan cutdown failed"))
    return res

@router.get("/format-presets")
def get_format_presets():
    from app.services.sovereign_video_director import FORMAT_PRESETS
    return {
        "success": True,
        "presets": FORMAT_PRESETS
    }

class ApplyAnalyzedPresetRequest(BaseModel):
    project_id: str
    preset_data: Dict[str, Any]
    auto_render: bool = True

class DetectArchetypeRequest(BaseModel):
    preset_data: Dict[str, Any]

@router.post("/apply-analyzed-preset")
async def apply_analyzed_preset(req: ApplyAnalyzedPresetRequest):
    res = await sovereign_video_director.apply_analyzed_preset(
        project_id=req.project_id,
        preset_data=req.preset_data,
        auto_re_render=req.auto_render
    )
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("error", "Apply analyzed preset failed"))
    return res

@router.post("/detect-preset-archetype")
def detect_preset_archetype(req: DetectArchetypeRequest):
    detected = sovereign_video_director.detect_preset_archetype(req.preset_data)
    from app.services.sovereign_video_director import FORMAT_PRESETS
    preset_info = FORMAT_PRESETS.get(detected, FORMAT_PRESETS.get("classic_shorts", {}))
    return {
        "success": True,
        "detected_archetype": detected,
        "archetype_name": preset_info.get("name", detected),
        "archetype_description": preset_info.get("description", "")
    }

class SliceStreamRequest(BaseModel):
    source_url: str
    start_seconds: float
    duration_seconds: float
    output_filename: Optional[str] = None

class CreateFromUrlSliceRequest(BaseModel):
    project_id: str
    source_url: str
    start_seconds: float
    duration_seconds: float
    script: Optional[str] = None
    title: Optional[str] = None
    format_preset: str = "classic_shorts"
    auto_render: bool = True

class GenerateSceneImageRequest(BaseModel):
    prompt: str
    aspect_ratio: str = "9:16"
    style_preset: str = "cinematic_photorealism"
    project_id: Optional[str] = None
    scene_index: Optional[int] = None

class AutoSoundDesignRequest(BaseModel):
    project_id: str
    auto_render: bool = True

@router.post("/slice-stream")
async def slice_stream(req: SliceStreamRequest):
    try:
        res = await sovereign_video_director.slice_stream_video(
            source_url=req.source_url,
            start_seconds=req.start_seconds,
            duration_seconds=req.duration_seconds,
            output_filename=req.output_filename
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create-from-url-slice")
async def create_from_url_slice(req: CreateFromUrlSliceRequest):
    res = await sovereign_video_director.create_project_from_url_slice(
        project_id=req.project_id,
        source_url=req.source_url,
        start_seconds=req.start_seconds,
        duration_seconds=req.duration_seconds,
        script=req.script,
        title=req.title,
        format_preset=req.format_preset,
        auto_render=req.auto_render
    )
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("error", "Create project from URL failed"))
    return res

@router.post("/generate-scene-image")
async def generate_scene_image(req: GenerateSceneImageRequest):
    res = await sovereign_video_director.generate_ai_scene_image(
        prompt=req.prompt,
        aspect_ratio=req.aspect_ratio,
        style_preset=req.style_preset,
        project_id=req.project_id,
        scene_index=req.scene_index
    )
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("error", "Image generation failed"))
    return res

@router.post("/auto-sound-design")
async def auto_sound_design(req: AutoSoundDesignRequest):
    res = await sovereign_video_director.auto_sound_design(
        project_id=req.project_id,
        auto_re_render=req.auto_render
    )
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("error", "Sound design failed"))
    return res

class StartCustomPresetDialogueRequest(BaseModel):
    reference_url: str
    preset_name: Optional[str] = None

class RefineCustomPresetRequest(BaseModel):
    base_preset_id: str
    narrative_intent: str
    context_hook_strategy: str
    sensory_custom: Optional[Dict[str, Any]] = None
    custom_name: Optional[str] = None
    additional_feedback: Optional[str] = None

class SegmentNarrationFpsFreeRequest(BaseModel):
    script_text: str
    total_duration_sec: float = 30.0

@router.post("/start-custom-preset-dialogue")
async def start_custom_preset_dialogue(req: StartCustomPresetDialogueRequest):
    """
    [Stage 1 ➔ 2] 1차 100% 복제 프리셋(Base Clone) 저장 후 채널 헌법 3대 전략 질문 반환
    """
    try:
        res = await sovereign_video_director.start_custom_preset_dialogue(
            reference_url=req.reference_url,
            preset_name=req.preset_name
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/refine-custom-preset")
async def refine_custom_preset(req: RefineCustomPresetRequest):
    """
    [Stage 2 확정] 창작자 답변 반영 ➔ 고유 커스텀 프리셋(Custom Preset) 생성 및 저장
    """
    try:
        res = await sovereign_video_director.refine_custom_preset(
            base_preset_id=req.base_preset_id,
            narrative_intent=req.narrative_intent,
            context_hook_strategy=req.context_hook_strategy,
            sensory_custom=req.sensory_custom,
            custom_name=req.custom_name,
            additional_feedback=req.additional_feedback
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/segment-narration-fps-free")
async def segment_narration_fps_free(req: SegmentNarrationFpsFreeRequest):
    """
    [지침서 V6.0] 1문장 2컷 나노 분절 및 MM:SS.ms 절대 타임코드 삼위일체 바인딩 테이블 생성
    """
    try:
        table = sovereign_video_director.segment_narration_fps_free(
            script_text=req.script_text,
            total_duration_sec=req.total_duration_sec
        )
        return {
            "success": True,
            "total_cuts": len(table),
            "multi_cut_table": table
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ProduceAutonomousRequest(BaseModel):
    preset_name: str = "기본 쇼츠 프리셋"
    archetype: str = "classic"
    manifest: Dict[str, Any] = {}
    script: Optional[str] = None
    channel_id: Optional[str] = None
    auto_enqueue: bool = True


@router.post("/produce-autonomous")
async def produce_autonomous(req: ProduceAutonomousRequest, db: Session = Depends(get_db)):
    """
    [E2E 자율 무인 렌더링 파이프라인]
    1. 청사진(VLStandardBlueprint v3) 파싱 및 감정 이모지 슬롯 동적 매핑
    2. Remotion / Headless FFmpeg 무인 MP4 렌더링
    3. auto_enqueue=True 시 work_queue_items에 즉시 등록하여 무인 자동 발행 파이프라인 가동
    """
    try:
        project_id = f"auto_{int(time.time())}_{uuid.uuid4().hex[:6]}"
        manifest = req.manifest or {}
        sample_preview = manifest.get("samplePreview", {})
        title = sample_preview.get("title") or req.preset_name or "바이럴 쇼츠 자동 제작"
        
        # 1. 대본 및 자막 cues 구성
        lines = sample_preview.get("lines", [])
        if not lines and req.script:
            # 스크립트 기반 줄바꿈 분절
            raw_lines = [l.strip() for l in req.script.split("\n") if l.strip()]
            lines = [{"text": l, "emotion": "neutral"} for l in raw_lines]

        if not lines:
            lines = [
                {"text": "0.8초 쨉쨉이 충격 반전 실화!", "emotion": "shock"},
                {"text": "상상도 못했던 결말이 지금 밝혀집니다.", "emotion": "suspense"},
                {"text": "끝까지 보면 소름돋는 사실!", "emotion": "rage"}
            ]

        # 2. 감정 이모지 슬롯 자동 매핑 (대본 의미/감정에 따른 이모지 주입)
        emoji_map = {
            "shock": "😱",
            "rage": "🤬",
            "laughter": "🤣",
            "crying": "😭",
            "suspense": "🚨",
            "love": "💖",
            "victory": "🏆",
            "warning": "⚠️",
            "neutral": "🔥"
        }

        subtitles = []
        cur_ms = 0
        step_ms = 2500
        for idx, line_obj in enumerate(lines):
            raw_text = line_obj.get("text", "")
            emo = line_obj.get("emotion", "neutral")
            injected_emoji = emoji_map.get(emo, "🔥")
            formatted_text = f"{raw_text} {injected_emoji}".strip()
            
            subtitles.append({
                "id": f"sub_{idx}",
                "start_ms": cur_ms,
                "end_ms": cur_ms + step_ms,
                "text": formatted_text,
                "emotion": emo,
                "emoji": injected_emoji
            })
            cur_ms += step_ms

        full_script = "\n".join([s["text"] for s in subtitles])

        # 3. 프로젝트 초기화 및 렌더링
        sb = await sovereign_video_director.init_or_update_project(
            project_id=project_id,
            title=title,
            script=full_script,
            subtitles=subtitles,
            style_preset=req.archetype,
        )

        render_res = await sovereign_video_director.render_project(project_id)
        video_path = render_res.get("video_path")

        # 4. work_queue_items에 자동 적재
        queue_item_id = None
        if req.auto_enqueue and video_path:
            queue_item = models.WorkQueueItem(
                title=title,
                description=f"[{req.archetype.upper()}] {req.preset_name} 무인 자동 생산 영상",
                video_path=video_path,
                channel_id=req.channel_id,
                status="PENDING",
                created_at=datetime.utcnow()
            )
            db.add(queue_item)
            db.commit()
            db.refresh(queue_item)
            queue_item_id = queue_item.id

        return {
            "success": True,
            "project_id": project_id,
            "title": title,
            "video_path": video_path,
            "queue_item_id": queue_item_id,
            "auto_enqueued": req.auto_enqueue,
            "message": f"'{req.preset_name}' 무인 렌더링이 성공적으로 완료되었습니다."
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"무인 자동 렌더링 오류: {str(e)}")
