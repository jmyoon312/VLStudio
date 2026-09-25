"""
OpenMontage Standard Pipeline Runner for ViraLoop Studio.
Implements the 5 canonical OpenMontage stages:
idea -> script -> scene_plan -> assets -> compose
with Backlot Living Storyboard event streaming and Script Approval Gate support.
"""

import os
import json
import logging
import asyncio
import uuid
from typing import Dict, Any, List, Optional, AsyncGenerator
from pathlib import Path

from app.services.openmontage.tool_registry import openmontage_registry
from app.services.openmontage.base_tool import ToolCapability

logger = logging.getLogger("openmontage_pipeline")


class OpenMontagePipelineRunner:
    """
    Executes and coordinates the 5-stage OpenMontage production pipeline.
    Emits real-time SSE / ndjson events for Backlot Living Storyboard synchronization.
    """

    # In-memory storage for script approval gates awaiting user action
    _pending_gates: Dict[str, Dict[str, Any]] = {}

    def __init__(self, agent_model: Optional[str] = None):
        self.agent_model = agent_model

    @classmethod
    def get_pending_gate(cls, gate_id: str) -> Optional[Dict[str, Any]]:
        return cls._pending_gates.get(gate_id)

    @classmethod
    def approve_script_gate(cls, gate_id: str, edited_script: Dict[str, Any]) -> bool:
        if gate_id in cls._pending_gates:
            cls._pending_gates[gate_id]["approved_script"] = edited_script
            cls._pending_gates[gate_id]["status"] = "approved"
            return True
        return False

    async def run_pipeline_stream(
        self,
        prompt: str,
        reference_media_path: Optional[str] = None,
        preset: Optional[Dict[str, Any]] = None,
        aspect_ratio: str = "1080x1920",
        form_factor: str = "classic",
        item_index: int = 0,
        total_items: int = 1,
        auto_approve_script: bool = True
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream progressive events across all 5 OpenMontage stages.
        """
        pipeline_id = f"montage_pipe_{uuid.uuid4().hex[:8]}"
        preset_name = preset.get("name", "기본 스타일") if preset else "기본 스타일"
        style = preset.get("style", {}) if preset else {}

        # ==========================================
        # STAGE 1: IDEA & BRIEF
        # ==========================================
        yield {
            "type": "stage",
            "stage": "idea",
            "pipeline_id": pipeline_id,
            "item_index": item_index,
            "total_items": total_items,
            "status": "in_progress",
            "title": "1단계: 아이디어 기획 및 레퍼런스 발골 (Idea & Brief)",
            "detail": f"프리셋 '{preset_name}' 적용 및 제작 브리프 구성 중..."
        }

        # Check if reference video requires media intelligence / channel DNA
        if reference_media_path and os.path.exists(reference_media_path):
            tool = openmontage_registry.get_tool("vl_media_intelligence_tool")
            if tool:
                media_res = await tool.run(video_path=reference_media_path, action="extract_frames", max_frames=8)
                if media_res.success:
                    logger.info(f"Extracted {media_res.data.get('frames_count')} reference frames")

        yield {
            "type": "stage",
            "stage": "idea",
            "pipeline_id": pipeline_id,
            "item_index": item_index,
            "total_items": total_items,
            "status": "completed",
            "title": "1단계: 아이디어 기획 및 레퍼런스 발골 완료",
            "detail": f"브리프 확정 완료 ({aspect_ratio}, 폼팩터: {form_factor})"
        }

        # ==========================================
        # STAGE 2: SCRIPT & HOOK
        # ==========================================
        yield {
            "type": "stage",
            "stage": "script",
            "pipeline_id": pipeline_id,
            "item_index": item_index,
            "total_items": total_items,
            "status": "in_progress",
            "title": "2단계: 대본 집필 및 훅 설계 (Script & Hook Gate)",
            "detail": "Hermes Brain이 3초 몰입 훅과 스토리텔링 스크립트를 작성 중입니다..."
        }

        from app.agent.hermes_core.brain import HermesBrain
        brain = HermesBrain(agent_model=self.agent_model)
        
        recipe = preset.get("recipe", "") if preset else ""
        content_rules = "\n- ".join(preset.get("content_rules", [])) if preset else ""

        system_instruction = f"""
당신은 대한민국 1티어 숏폼 총괄 연출 디렉터(OpenMontage Director)입니다.
사용자의 요청과 고정 제작 프리셋 기준을 엄격히 준수하여 15~40초 분량의 대본을 작성하세요.

[고정 제작 프리셋 기준]
- 프리셋 이름: {preset_name}
- 제작 절차 및 레시피: {recipe}
- 필수 연출 규칙:
- {content_rules}

[사용자 요청]
{prompt}

반드시 아래 JSON 형식으로만 응답하세요 (순수 JSON만):
{{
    "title": "영상 대제목 (20자 이내)",
    "hook": "첫 3초 시선 집중 훅 멘트",
    "voice_id": "google_female_calm",
    "cues": [
        {{"start_ms": 0, "end_ms": 3000, "text": "첫 번째 훅 대사"}},
        {{"start_ms": 3000, "end_ms": 6500, "text": "두 번째 본론 대사"}},
        {{"start_ms": 6500, "end_ms": 11000, "text": "세 번째 반전 및 결론"}}
    ],
    "estimated_duration_s": 15
}}
"""
        try:
            llm_response = brain.llm.generate(
                prompt=system_instruction,
                model=brain.agent_model,
                temperature=0.7
            )
            cleaned = llm_response.strip()
            if "```json" in cleaned:
                cleaned = cleaned.split("```json")[1].split("```")[0].strip()
            elif "```" in cleaned:
                cleaned = cleaned.split("```")[1].split("```")[0].strip()
            script_data = json.loads(cleaned)
        except Exception as e:
            logger.warning(f"Script generation fallback: {e}")
            script_data = {
                "title": prompt[:20] if prompt else "바이럴 숏폼",
                "hook": prompt,
                "voice_id": "google_female_calm",
                "cues": [
                    {"start_ms": 0, "end_ms": 3500, "text": prompt[:30]},
                    {"start_ms": 3500, "end_ms": 7000, "text": "바이럴루프 주권형 팩토리 자율 제작 영상입니다."},
                    {"start_ms": 7000, "end_ms": 11000, "text": "원클릭으로 프리셋을 저장하여 재사용할 수 있습니다."}
                ],
                "estimated_duration_s": 12
            }

        # Script Gate registration
        self._pending_gates[pipeline_id] = {
            "pipeline_id": pipeline_id,
            "script_data": script_data,
            "status": "pending_approval" if not auto_approve_script else "approved",
            "prompt": prompt
        }

        yield {
            "type": "stage",
            "stage": "script",
            "pipeline_id": pipeline_id,
            "item_index": item_index,
            "total_items": total_items,
            "status": "completed",
            "title": "2단계: 대본 집필 완료 (대본 승인 게이트)",
            "detail": f"대제목: {script_data.get('title')}\n훅: {script_data.get('hook')}",
            "data": script_data,
            "gate_id": pipeline_id,
            "script_gate_ready": True
        }

        # ==========================================
        # STAGE 3: SCENE PLAN & CONTACT SHEET
        # ==========================================
        cues = script_data.get("cues", [])
        yield {
            "type": "stage",
            "stage": "scene_plan",
            "pipeline_id": pipeline_id,
            "item_index": item_index,
            "total_items": total_items,
            "status": "in_progress",
            "title": "3단계: 씬별 타임코드 및 콘택트 시트 설계 (Scene Plan)",
            "detail": f"총 {len(cues)}개 씬/자막 구간 타임코드 및 시각 레이아웃 배정 중..."
        }

        scene_cards = []
        for idx, cue in enumerate(cues):
            scene_cards.append({
                "scene_index": idx + 1,
                "start_ms": cue.get("start_ms", 0),
                "end_ms": cue.get("end_ms", 3000),
                "duration_ms": cue.get("end_ms", 3000) - cue.get("start_ms", 0),
                "text": cue.get("text", ""),
                "voice_id": script_data.get("voice_id", "google_female_calm"),
                "status": "planned"
            })

        yield {
            "type": "stage",
            "stage": "scene_plan",
            "pipeline_id": pipeline_id,
            "item_index": item_index,
            "total_items": total_items,
            "status": "completed",
            "title": "3단계: 콘택트 시트 설계 완료",
            "detail": f"총 {len(scene_cards)}개 씬 구성 완료",
            "scenes": scene_cards
        }

        # ==========================================
        # STAGE 4: ASSETS & TTS SYNTHESIS
        # ==========================================
        voice_id = script_data.get("voice_id", "google_female_calm")
        yield {
            "type": "stage",
            "stage": "assets",
            "pipeline_id": pipeline_id,
            "item_index": item_index,
            "total_items": total_items,
            "status": "in_progress",
            "title": "4단계: AI 음성 및 미디어 에셋 합성 (Assets & TTS)",
            "detail": f"AI 목소리({voice_id}) 합성 및 자막 에셋 패키징 중..."
        }

        audio_path = None
        full_speech = " ".join([c["text"] for c in cues if c.get("text")])
        if full_speech:
            tts_tool = openmontage_registry.get_tool("vl_supertonic_tts_tool")
            if tts_tool:
                tts_res = await tts_tool.run(text=full_speech, voice_id=voice_id)
                if tts_res.success:
                    audio_path = tts_res.data.get("audio_path")

        yield {
            "type": "stage",
            "stage": "assets",
            "pipeline_id": pipeline_id,
            "item_index": item_index,
            "total_items": total_items,
            "status": "completed",
            "title": "4단계: 에셋 합성 완료",
            "detail": f"음성 생성 완료: {os.path.basename(audio_path) if audio_path else '생략'}"
        }

        # ==========================================
        # STAGE 5: FINAL COMPOSE & EXPORT
        # ==========================================
        yield {
            "type": "stage",
            "stage": "compose",
            "pipeline_id": pipeline_id,
            "item_index": item_index,
            "total_items": total_items,
            "status": "in_progress",
            "title": "5단계: 다중 런타임 최종 렌더링 (Compose)",
            "detail": f"FFmpeg ASS 번인 및 4대 폼팩터({form_factor}) 렌더링 중..."
        }

        clips = []
        if reference_media_path and os.path.exists(reference_media_path):
            clips.append({
                "source_path": reference_media_path,
                "start_ms": 0,
                "end_ms": cues[-1]["end_ms"] if cues else 15000
            })

        compose_tool = openmontage_registry.get_tool("vl_compose_tool")
        render_res = await compose_tool.run(
            clips=clips,
            cues=cues,
            style=style,
            title=script_data.get("title"),
            audio_path=audio_path,
            form_factor=form_factor
        )

        output_video_path = render_res.data.get("output_path") if render_res.success else None
        receipt_path = render_res.data.get("receipt_path") if render_res.success else None

        yield {
            "type": "stage",
            "stage": "compose",
            "pipeline_id": pipeline_id,
            "item_index": item_index,
            "total_items": total_items,
            "status": "completed" if output_video_path else "failed",
            "title": "5단계: 최종 비디오 렌더링 완료",
            "detail": f"출력 완료: {os.path.basename(output_video_path)}" if output_video_path else "렌더링 실패"
        }

        # Deliverable payload
        yield {
            "type": "deliverable",
            "pipeline_id": pipeline_id,
            "item_index": item_index,
            "total_items": total_items,
            "media_path": reference_media_path,
            "video_path": output_video_path,
            "receipt_path": receipt_path,
            "title": script_data.get("title"),
            "voice_id": voice_id,
            "preset_id": preset.get("id") if preset else None,
            "style": style,
            "recipe": recipe,
            "content_rules": preset.get("content_rules", []) if preset else [],
            "cues": cues,
            "scenes": scene_cards,
            "form_factor": form_factor
        }
