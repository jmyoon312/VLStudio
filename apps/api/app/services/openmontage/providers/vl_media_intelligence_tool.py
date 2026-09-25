"""
VLMediaIntelligenceTool: OpenMontage Provider Adapter for Visual and Acoustic Video Analysis.
Extracts 1fps / scene-change frames, silence intervals, audio peaks, and STT transcripts.
"""

from pathlib import Path
from typing import Dict, Any, List, Optional
from app.services.openmontage.base_tool import BaseTool, ToolCapability, ToolResult
from app.services.media_intelligence.core import MediaIntelligenceCore


class VLMediaIntelligenceTool(BaseTool):
    name: str = "vl_media_intelligence_tool"
    description: str = "Analyzes video files for keyframes, audio silence, peaks, and visual layout narrative"
    capabilities: List[str] = [ToolCapability.VIDEO_ANALYZE, ToolCapability.VISION_INTERLEAVE]
    parameters_schema: Dict[str, Any] = {
        "properties": {
            "video_path": {"type": "string", "description": "Absolute path to local video file"},
            "action": {"type": "string", "enum": ["extract_frames", "analyze_audio", "analyze_layout"], "default": "extract_frames"},
            "max_frames": {"type": "integer", "default": 16}
        },
        "required": ["video_path"]
    }

    def __init__(self):
        super().__init__()
        self.core = MediaIntelligenceCore()

    async def execute(
        self,
        video_path: str,
        action: str = "extract_frames",
        max_frames: int = 16
    ) -> Dict[str, Any]:
        p = Path(video_path)
        if not p.exists():
            raise FileNotFoundError(f"Video file not found at: {video_path}")

        duration = await self.core.get_video_duration(p)

        if action == "extract_frames":
            frames = await self.core.extract_keyframes(p, max_frames=max_frames)
            return {
                "duration_s": duration,
                "frames_count": len(frames),
                "frames": frames
            }
        elif action == "analyze_audio":
            audio_info = await self.core.analyze_audio_acoustics(p)
            return {
                "duration_s": duration,
                "acoustics": audio_info
            }
        elif action == "analyze_layout":
            frames = await self.core.extract_keyframes(p, max_frames=max_frames)
            narrative = await self.core.analyze_visual_narrative(frames, purpose="layout_dna")
            return {
                "duration_s": duration,
                "frames": frames,
                "layout_analysis": narrative
            }
        else:
            return {"duration_s": duration}
