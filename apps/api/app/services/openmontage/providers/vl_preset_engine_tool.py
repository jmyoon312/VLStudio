"""
VLPresetEngineTool: OpenMontage Provider Adapter for Sovereign Video Presets.
Supports preset loading, customization, cloning, and parametric ASS rendering.
"""

from typing import Dict, Any, List, Optional
from app.services.openmontage.base_tool import BaseTool, ToolCapability, ToolResult
from app.services.sovereign_preset_engine import sovereign_preset_engine


class VLPresetEngineTool(BaseTool):
    name: str = "vl_preset_engine_tool"
    description: str = "Manages Sovereign Presets (.preset.json) and compiles ASS subtitles for pixel-perfect NLE reproduction"
    capabilities: List[str] = [ToolCapability.PRESET, ToolCapability.COMPOSE]
    parameters_schema: Dict[str, Any] = {
        "properties": {
            "action": {"type": "string", "enum": ["render", "compile_ass", "get_style"], "default": "render"},
            "clips": {"type": "array", "description": "List of source clips with start_ms and end_ms"},
            "cues": {"type": "array", "description": "Subtitle cues with start_ms, end_ms, and text"},
            "style": {"type": "object", "description": "Visual preset style specification"},
            "title": {"type": "string", "description": "Optional title text"},
            "audio_path": {"type": "string", "description": "Optional background speech/TTS audio path"},
            "output_path": {"type": "string", "description": "Target MP4 export path"}
        },
        "required": ["action"]
    }

    async def execute(
        self,
        action: str = "render",
        clips: List[Dict[str, Any]] = None,
        cues: List[Dict[str, Any]] = None,
        style: Dict[str, Any] = None,
        title: Optional[str] = None,
        audio_path: Optional[str] = None,
        output_path: Optional[str] = None
    ) -> Dict[str, Any]:
        clips = clips or []
        cues = cues or []
        style = style or {}

        if action == "render":
            return await sovereign_preset_engine.render_parametric(
                clips=clips,
                cues=cues,
                style=style,
                title=title,
                audio_path=audio_path,
                output_path=output_path
            )
        elif action == "compile_ass":
            from app.services.sovereign_preset_engine import compile_ass_subtitles
            target_size = style.get("output", {}).get("size", "1080x1920")
            ass_content = compile_ass_subtitles(style=style, cues=cues, title=title, target_size=target_size)
            return {"ass_content": ass_content}
        else:
            return {"style": style}
