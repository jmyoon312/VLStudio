"""
VLComposeTool: OpenMontage Provider Adapter for Multi-Runtime Composition.
Supports FFmpeg Parametric Burn-in, 4 Sovereign Studio Layouts, and Remotion/HyperFrames integration.
"""

from typing import Dict, Any, List, Optional
from app.services.openmontage.base_tool import BaseTool, ToolCapability, ToolResult
from app.services.sovereign_preset_engine import sovereign_preset_engine


class VLComposeTool(BaseTool):
    name: str = "vl_compose_tool"
    description: str = "Composes final video with parametric ASS subtitles, multi-track audio, and studio layouts"
    capabilities: List[str] = [ToolCapability.COMPOSE]
    parameters_schema: Dict[str, Any] = {
        "properties": {
            "clips": {"type": "array", "description": "Source video clips"},
            "cues": {"type": "array", "description": "Synchronized subtitle cues"},
            "style": {"type": "object", "description": "Visual layout styling"},
            "title": {"type": "string", "description": "Main title string"},
            "audio_path": {"type": "string", "description": "Synthesized TTS speech or BGM track"},
            "form_factor": {
                "type": "string",
                "enum": ["classic", "insta", "gunlimbo", "ssul"],
                "default": "classic",
                "description": "4 Sovereign Studio form factor"
            },
            "output_path": {"type": "string", "description": "Target export destination path"}
        },
        "required": ["cues"]
    }

    async def execute(
        self,
        cues: List[Dict[str, Any]],
        clips: Optional[List[Dict[str, Any]]] = None,
        style: Optional[Dict[str, Any]] = None,
        title: Optional[str] = None,
        audio_path: Optional[str] = None,
        form_factor: str = "classic",
        output_path: Optional[str] = None
    ) -> Dict[str, Any]:
        clips = clips or []
        style = style or {}

        # Form factor specific style adjustments
        adjusted_style = dict(style)
        if form_factor == "ssul":
            # Ssul mode: higher subtitle margin, accumulated lines
            if "caption" in adjusted_style:
                adjusted_style["caption"]["position"] = "middle"
                adjusted_style["caption"]["margin_v_pct"] = 35
        elif form_factor == "gunlimbo":
            # Gunlimbo mode: high hook band, rapid punchy subtitles
            if "title" in adjusted_style:
                adjusted_style["title"]["margin_v_pct"] = 12
        elif form_factor == "insta":
            # Instagram feed format
            if "output" not in adjusted_style:
                adjusted_style["output"] = {}
            adjusted_style["output"]["size"] = "1080x1080"

        render_res = await sovereign_preset_engine.render_parametric(
            clips=clips,
            cues=cues,
            style=adjusted_style,
            title=title,
            audio_path=audio_path,
            output_path=output_path
        )

        return {
            "output_path": render_res.get("output_path"),
            "receipt_path": render_res.get("receipt_path"),
            "form_factor": form_factor,
            "status": "completed" if render_res.get("output_path") else "failed"
        }
