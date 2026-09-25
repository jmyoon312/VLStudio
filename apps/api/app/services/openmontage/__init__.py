"""
OpenMontage Capability-First Framework Package for ViraLoop Studio.
Automatically registers standard provider tools into the global registry.
"""

from app.services.openmontage.base_tool import BaseTool, ToolCapability, ToolResult
from app.services.openmontage.tool_registry import ToolRegistry, openmontage_registry
from app.services.openmontage.pipeline_runner import OpenMontagePipelineRunner
from app.services.openmontage.viraloop_openmontage_mcp import ViraLoopOpenMontageMCP

# Register default providers
from app.services.openmontage.providers.vl_channel_dna_tool import VLChannelDnaTool
from app.services.openmontage.providers.vl_preset_engine_tool import VLPresetEngineTool
from app.services.openmontage.providers.vl_media_intelligence_tool import VLMediaIntelligenceTool
from app.services.openmontage.providers.vl_supertonic_tts_tool import VLSupertonicTTSTool
from app.services.openmontage.providers.vl_capcut_draft_tool import VLCapCutDraftTool
from app.services.openmontage.providers.vl_compose_tool import VLComposeTool

openmontage_registry.register(VLChannelDnaTool())
openmontage_registry.register(VLPresetEngineTool())
openmontage_registry.register(VLMediaIntelligenceTool())
openmontage_registry.register(VLSupertonicTTSTool())
openmontage_registry.register(VLCapCutDraftTool())
openmontage_registry.register(VLComposeTool())

__all__ = [
    "BaseTool",
    "ToolCapability",
    "ToolResult",
    "ToolRegistry",
    "openmontage_registry",
    "OpenMontagePipelineRunner",
    "ViraLoopOpenMontageMCP"
]
