"""
Pixagent Presets Tool - Reverse engineered from Pixeling 1.0.110 MCP Ecosystem.
Provides 5 core MCP tools for Hermes Agent:
1. pixeling_status: Inspect active preset, content rules, instructions, and session draft.
2. pixeling_set_preset_draft: Commit script, clips, cues, style, and recipe to session.
3. pixeling_render_with_preset: Render video via Parametric NLE / Template ABI with FFprobe conformance.
4. pixeling_revise_preset_draft: Rapid incremental revision loop (audio/video reuse, subtitle/style patch).
5. pixeling_register_preset_result: Commit conformance-tested receipt to permanent preset library.
"""

import os
import json
import copy
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from pathlib import Path

from app.services.sovereign_preset_engine import SovereignPresetEngine, DEFAULT_STYLE

LOCAL_APPDATA = os.environ.get("LOCALAPPDATA", str(Path.home() / "AppData" / "Local"))
PRESETS_DIR = Path(LOCAL_APPDATA) / "ViraLoop Studio" / "media" / "03_Assets" / "presets"
PRESETS_DIR.mkdir(parents=True, exist_ok=True)

logger = logging.getLogger("pixagent_presets_tool")


class PixagentPresetsManager:
    """
    Session-level draft manager and tool execution router for Pixagent Presets.
    Maintains memory of in-flight drafts to enable instant revision loops.
    """

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(PixagentPresetsManager, cls).__new__(cls)
            cls._instance._session_drafts = {}
            cls._instance._engine = SovereignPresetEngine()
        return cls._instance

    def _get_or_create_draft(self, session_id: str) -> Dict[str, Any]:
        if session_id not in self._session_drafts:
            self._session_drafts[session_id] = {
                "session_id": session_id,
                "preset_id": None,
                "preset_name": None,
                "style": copy.deepcopy(DEFAULT_STYLE),
                "recipe": "Standard 5-Stage Sovereign Video Synthesis",
                "content_rules": [
                    "화면 상단에 볼드 타이틀을 배치하여 시선 집중",
                    "자막은 하단 18% 마진으로 모바일 UI(댓글/좋아요) 겹침 방지",
                    "대사 템포에 맞춰 마이크로초 단위 자막 타이밍 유지"
                ],
                "instructions": "이 요청은 프리셋 영상 제작이다. 스타일 변경 시 pixeling_revise_preset_draft를 호출한다.",
                "clips": [],
                "cues": [],
                "title": None,
                "audio_path": None,
                "content_draft": "",
                "last_deliverable": None,
                "updated_at": datetime.now().isoformat()
            }
        return self._session_drafts[session_id]

    async def pixeling_status(self, session_id: str) -> Dict[str, Any]:
        """
        Tool 1: Returns active preset, instructions, content rules, and current session draft.
        """
        draft = self._get_or_create_draft(session_id)
        return {
            "status": "ready",
            "session_id": session_id,
            "preset_id": draft.get("preset_id"),
            "preset_name": draft.get("preset_name"),
            "style": draft.get("style"),
            "recipe": draft.get("recipe"),
            "content_rules": draft.get("content_rules"),
            "instructions": draft.get("instructions"),
            "has_draft": bool(draft.get("content_draft") or draft.get("cues")),
            "has_deliverable": bool(draft.get("last_deliverable")),
            "supported_tools": [
                "pixeling_status",
                "pixeling_set_preset_draft",
                "pixeling_render_with_preset",
                "pixeling_revise_preset_draft",
                "pixeling_register_preset_result"
            ]
        }

    async def pixeling_set_preset_draft(
        self,
        session_id: str,
        content_draft: Optional[str] = None,
        clips: Optional[List[Dict[str, Any]]] = None,
        cues: Optional[List[Dict[str, Any]]] = None,
        title: Optional[str] = None,
        audio_path: Optional[str] = None,
        style: Optional[Dict[str, Any]] = None,
        recipe: Optional[str] = None,
        content_rules: Optional[List[str]] = None,
        preset_id: Optional[str] = None,
        preset_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Tool 2: Commits script, media clips, subtitle cues, and style to the session draft.
        """
        draft = self._get_or_create_draft(session_id)
        if content_draft is not None:
            draft["content_draft"] = content_draft
        if clips is not None:
            draft["clips"] = clips
        if cues is not None:
            draft["cues"] = cues
        if title is not None:
            draft["title"] = title
        if audio_path is not None:
            draft["audio_path"] = audio_path
        if style is not None:
            draft["style"] = style
        if recipe is not None:
            draft["recipe"] = recipe
        if content_rules is not None:
            draft["content_rules"] = content_rules
        if preset_id is not None:
            draft["preset_id"] = preset_id
        if preset_name is not None:
            draft["preset_name"] = preset_name
        draft["updated_at"] = datetime.now().isoformat()

        logger.info(f"[PixagentPresets] Draft committed for session {session_id} (cues={len(draft.get('cues', []))})")
        return {
            "success": True,
            "session_id": session_id,
            "message": "제작 초안이 세션에 안전하게 저장되었습니다.",
            "cues_count": len(draft.get("cues", [])),
            "clips_count": len(draft.get("clips", []))
        }

    async def pixeling_render_with_preset(
        self,
        session_id: str,
        style_override: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Tool 3: Renders video using parametric NLE or template package,
        verifies FFprobe conformance, and generates .preset.json receipt.
        """
        draft = self._get_or_create_draft(session_id)
        style = style_override or draft.get("style", copy.deepcopy(DEFAULT_STYLE))
        clips = draft.get("clips", [])
        cues = draft.get("cues", [])
        title = draft.get("title")
        audio_path = draft.get("audio_path")

        logger.info(f"[PixagentPresets] Rendering video for session {session_id}...")
        res = await self._engine.render_parametric(
            clips=clips,
            cues=cues,
            style=style,
            title=title,
            audio_path=audio_path
        )

        deliverable = {
            "title": title or "숏폼 완성 영상",
            "video_path": res["output_path"],
            "receipt_path": res.get("receipt_path"),
            "style": style,
            "recipe": draft.get("recipe"),
            "content_rules": draft.get("content_rules"),
            "cues": cues,
            "conformance": res.get("conformance")
        }
        draft["last_deliverable"] = deliverable
        draft["updated_at"] = datetime.now().isoformat()

        return {
            "success": True,
            "session_id": session_id,
            "deliverable": deliverable,
            "message": "영상이 픽셀링 규격에 맞춰 성공적으로 렌더링되었습니다."
        }

    async def pixeling_revise_preset_draft(
        self,
        session_id: str,
        revision_intent: str,
        style_patch: Optional[Dict[str, Any]] = None,
        text_patch: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Tool 4: Rapid incremental revision loop (Benchmarked from Pixeling 1.0.110).
        Reuses existing audio and video binaries without regenerating them,
        applying pinpoint patches to typography/style and re-burning in 1-2 seconds.
        """
        draft = self._get_or_create_draft(session_id)
        if not draft.get("last_deliverable") and not draft.get("cues"):
            raise ValueError(f"세션 {session_id}에 수정할 이전 영상이나 대본 초안이 존재하지 않습니다.")

        logger.info(f"[PixagentPresets] Executing rapid revision loop for session {session_id}: '{revision_intent}'")

        # 1. Deep merge style_patch
        current_style = copy.deepcopy(draft.get("style", DEFAULT_STYLE))
        if style_patch:
            self._deep_merge(current_style, style_patch)
            draft["style"] = current_style

        # 2. Apply text_patch if specific cue text updated
        cues = draft.get("cues", [])
        if text_patch:
            for cue in cues:
                txt = cue.get("text", "")
                for old_val, new_val in text_patch.items():
                    if old_val in txt:
                        cue["text"] = txt.replace(old_val, new_val)

        # 3. Fast re-render keeping existing audio & clips!
        clips = draft.get("clips", [])
        audio_path = draft.get("audio_path")
        title = draft.get("title")

        res = await self._engine.render_parametric(
            clips=clips,
            cues=cues,
            style=current_style,
            title=title,
            audio_path=audio_path
        )

        deliverable = {
            "title": title or "수정된 숏폼 완성 영상",
            "video_path": res["output_path"],
            "receipt_path": res.get("receipt_path"),
            "style": current_style,
            "recipe": draft.get("recipe"),
            "content_rules": draft.get("content_rules"),
            "cues": cues,
            "conformance": res.get("conformance"),
            "revision_note": f"피드백 반영 완료: {revision_intent}"
        }
        draft["last_deliverable"] = deliverable
        draft["updated_at"] = datetime.now().isoformat()

        logger.info(f"[PixagentPresets] Revision completed in ultra-fast turnaround: {res['output_path']}")
        return {
            "success": True,
            "session_id": session_id,
            "deliverable": deliverable,
            "message": f"피드백('{revision_intent}')을 반영하여 기존 음성과 소스를 유지한 채 초고속 재렌더링을 완료했습니다."
        }

    async def pixeling_register_preset_result(
        self,
        session_id: str,
        name: str,
        description: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Tool 5: Registers conformance-tested deliverable style and recipe as a permanent Sovereign Preset.
        """
        draft = self._get_or_create_draft(session_id)
        style = draft.get("style", copy.deepcopy(DEFAULT_STYLE))
        content_rules = draft.get("content_rules", [])

        import uuid
        preset_id = f"preset_{uuid.uuid4().hex[:12]}"
        preset_dict = {
            "id": preset_id,
            "name": name,
            "category": "custom",
            "category_tab": "personal",
            "aspect_ratio": style.get("output", {}).get("size", "1080x1920"),
            "description": description or f"대화형 디렉터에서 발골/등록된 맞춤 프리셋: {name}",
            "style": style,
            "content_rules": content_rules,
            "recipe": draft.get("recipe", "소버린 대화형 디렉터 제작 레시피"),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }

        preset_file = PRESETS_DIR / f"{preset_id}.json"
        with open(preset_file, "w", encoding="utf-8") as f:
            json.dump(preset_dict, f, indent=2, ensure_ascii=False)

        draft["preset_id"] = preset_id
        draft["preset_name"] = name

        logger.info(f"[PixagentPresets] Registered new permanent preset file: {preset_file}")
        return {
            "success": True,
            "preset": preset_dict,
            "message": f"프리셋 [{name}]이 영구 라이브러리에 안전하게 등록되었습니다!"
        }

    @staticmethod
    def _deep_merge(target: Dict[str, Any], patch: Dict[str, Any]) -> None:
        """Recursively merge dictionary patch into target."""
        for k, v in patch.items():
            if isinstance(v, dict) and k in target and isinstance(target[k], dict):
                PixagentPresetsManager._deep_merge(target[k], v)
            else:
                target[k] = v


# Global singleton instance
pixagent_presets = PixagentPresetsManager()
