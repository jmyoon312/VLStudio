"""
ViraLoop OpenMontage MCP Server Tools Interface.
Exposes Capability-First tools over standard MCP (Model Context Protocol).
"""

from typing import Dict, Any, List, Optional
from app.services.openmontage.tool_registry import openmontage_registry
from app.services.openmontage.pipeline_runner import OpenMontagePipelineRunner


class ViraLoopOpenMontageMCP:
    """
    Standard MCP Interface for OpenMontage in ViraLoop Studio.
    """

    @staticmethod
    def montage_discover_capabilities() -> Dict[str, Any]:
        """Discover all active OpenMontage tools, capability groups, and active providers."""
        return {
            "capabilities": openmontage_registry.list_capabilities(),
            "tools": openmontage_registry.list_tools(),
            "pipeline_stages": ["idea", "script", "scene_plan", "assets", "compose"]
        }

    @staticmethod
    async def montage_analyze_reference(channel_or_video_url: str, sample_count: int = 12) -> Dict[str, Any]:
        """Analyze a reference video or channel to extract 4-Tier DNA."""
        tool = openmontage_registry.get_tool("vl_channel_dna_tool")
        if not tool:
            return {"success": False, "error": "vl_channel_dna_tool not registered"}
        res = await tool.run(channel_url=channel_or_video_url, sample_count=sample_count)
        return res.dict()

    @staticmethod
    async def montage_create_production_plan(prompt: str, preset_id: Optional[str] = None, aspect_ratio: str = "1080x1920") -> Dict[str, Any]:
        """Generate production plan with script, hook, and scene structure."""
        runner = OpenMontagePipelineRunner()
        # Collect stage 1 and stage 2 outputs
        plan_events = []
        async for event in runner.run_pipeline_stream(prompt=prompt, aspect_ratio=aspect_ratio):
            plan_events.append(event)
            if event.get("stage") == "script" and event.get("status") == "completed":
                return {
                    "success": True,
                    "pipeline_id": event.get("pipeline_id"),
                    "plan": event.get("data")
                }
        return {"success": False, "events": plan_events}

    @staticmethod
    async def montage_generate_assets(text: str, voice_id: str = "google_female_calm") -> Dict[str, Any]:
        """Synthesize TTS and asset packages."""
        tool = openmontage_registry.get_tool("vl_supertonic_tts_tool")
        if not tool:
            return {"success": False, "error": "vl_supertonic_tts_tool not registered"}
        res = await tool.run(text=text, voice_id=voice_id)
        return res.dict()

    @staticmethod
    async def montage_render_video(
        cues: List[Dict[str, Any]],
        clips: Optional[List[Dict[str, Any]]] = None,
        style: Optional[Dict[str, Any]] = None,
        title: Optional[str] = None,
        audio_path: Optional[str] = None,
        form_factor: str = "classic"
    ) -> Dict[str, Any]:
        """Render final video composition with ASS subtitles and audio."""
        tool = openmontage_registry.get_tool("vl_compose_tool")
        if not tool:
            return {"success": False, "error": "vl_compose_tool not registered"}
        res = await tool.run(
            cues=cues,
            clips=clips,
            style=style,
            title=title,
            audio_path=audio_path,
            form_factor=form_factor
        )
        return res.dict()

    @staticmethod
    async def montage_export_capcut_draft(
        project_name: str,
        video_path: Optional[str] = None,
        cues: Optional[List[Dict[str, Any]]] = None,
        audio_path: Optional[str] = None,
        duration_s: float = 15.0
    ) -> Dict[str, Any]:
        """Export composition to CapCut project draft format."""
        tool = openmontage_registry.get_tool("vl_capcut_draft_tool")
        if not tool:
            return {"success": False, "error": "vl_capcut_draft_tool not registered"}
        res = await tool.run(
            project_name=project_name,
            video_path=video_path,
            cues=cues,
            audio_path=audio_path,
            duration_s=duration_s
        )
        return res.dict()
