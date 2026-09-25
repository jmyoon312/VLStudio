"""
VLChannelDnaTool: OpenMontage Provider Adapter for Channel DNA Deep Forensic Analysis.
"""

from typing import Dict, Any, List
from app.services.openmontage.base_tool import BaseTool, ToolCapability, ToolResult
from app.services.channel_dna_service import ChannelDNAService


class VLChannelDnaTool(BaseTool):
    name: str = "vl_channel_dna_tool"
    description: str = "Extracts 4-Tier Channel DNA (Visual, Script, Audio, Source Origin) from reference YouTube channel or video"
    capabilities: List[str] = [ToolCapability.CHANNEL_DNA, ToolCapability.VIDEO_ANALYZE]
    parameters_schema: Dict[str, Any] = {
        "properties": {
            "channel_url": {"type": "string", "description": "YouTube channel URL or reference video URL"},
            "sample_count": {"type": "integer", "description": "Number of reference shorts to sample", "default": 12},
            "video_path": {"type": "string", "description": "Local video file path for direct forensic extraction"}
        },
        "required": ["channel_url"]
    }

    async def execute(self, channel_url: str, sample_count: int = 12, video_path: str = None) -> Dict[str, Any]:
        result = ChannelDNAService.analyze_channel(
            channel_url=channel_url,
            sample_count=sample_count,
            video_path=video_path
        )
        return result
