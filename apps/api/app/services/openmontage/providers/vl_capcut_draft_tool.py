"""
VLCapCutDraftTool: OpenMontage Provider Adapter for CapCut Project Draft Packaging.
"""

import os
from typing import Dict, Any, List, Optional
from app.services.openmontage.base_tool import BaseTool, ToolCapability, ToolResult
from app.services.capcut_generator import CapCutGenerator


class VLCapCutDraftTool(BaseTool):
    name: str = "vl_capcut_draft_tool"
    description: str = "Generates a complete CapCut PC Draft project package with multi-tracks, texts, and timing"
    capabilities: List[str] = [ToolCapability.CAPCUT_DRAFT, ToolCapability.COMPOSE]
    parameters_schema: Dict[str, Any] = {
        "properties": {
            "project_name": {"type": "string", "default": "ViraLoop CapCut Export"},
            "video_path": {"type": "string", "description": "Base video file path"},
            "cues": {"type": "array", "description": "List of subtitle cues with start_ms, end_ms, text"},
            "audio_path": {"type": "string", "description": "Optional speech/TTS audio file path"},
            "duration_s": {"type": "number", "default": 15.0}
        },
        "required": ["project_name"]
    }

    async def execute(
        self,
        project_name: str = "ViraLoop CapCut Export",
        video_path: Optional[str] = None,
        cues: Optional[List[Dict[str, Any]]] = None,
        audio_path: Optional[str] = None,
        duration_s: float = 15.0
    ) -> Dict[str, Any]:
        generator = CapCutGenerator(project_name=project_name)

        if video_path and os.path.exists(video_path):
            generator.add_video_segment(video_path, duration_sec=duration_s, start_time_sec=0)

        if audio_path and os.path.exists(audio_path):
            generator.add_audio_segment(audio_path, duration_sec=duration_s, start_time_sec=0)

        if cues:
            for c in cues:
                txt = c.get("text", "")
                if not txt:
                    continue
                start_sec = c.get("start_ms", 0) / 1000.0
                end_sec = c.get("end_ms", 3000) / 1000.0
                dur_sec = max(0.5, end_sec - start_sec)
                generator.add_text_segment(text=txt, duration_sec=dur_sec, start_time_sec=start_sec)

        draft_data = generator.generate_draft_json()
        return {
            "project_id": generator.project_id,
            "project_name": project_name,
            "draft_data": draft_data
        }
