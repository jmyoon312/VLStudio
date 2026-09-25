"""
OpenMontage Capability-First Base Tool Contract.
Implements the OpenMontage tool abstraction for ViraLoop Studio.
"Agent IS the Intelligence, Python IS Tools & Persistence"
"""

import time
import inspect
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field


class ToolCapability:
    VIDEO_ANALYZE = "video_analyze"
    VISION_INTERLEAVE = "vision_interleave"
    CHANNEL_DNA = "channel_dna"
    PRESET = "preset"
    TTS = "tts"
    COMPOSE = "compose"
    CAPCUT_DRAFT = "capcut_draft"
    STORYBOARD = "storyboard"
    ASSET_SCOUT = "asset_scout"


class ToolResult(BaseModel):
    success: bool
    data: Dict[str, Any] = Field(default_factory=dict)
    error: Optional[str] = None
    execution_time_ms: float = 0.0
    tool_name: str = ""


class BaseTool(ABC):
    """
    Abstract Base Tool for OpenMontage and ViraLoop Studio.
    Each tool registers its capabilities and accepts parameters validated against its schema.
    """

    name: str = "base_tool"
    description: str = "Base tool contract"
    capabilities: List[str] = []
    parameters_schema: Dict[str, Any] = {}

    def to_mcp_descriptor(self) -> Dict[str, Any]:
        """Convert tool contract to MCP-compatible tool schema descriptor."""
        return {
            "name": self.name,
            "description": self.description,
            "capabilities": self.capabilities,
            "inputSchema": {
                "type": "object",
                "properties": self.parameters_schema.get("properties", {}),
                "required": self.parameters_schema.get("required", [])
            }
        }

    async def run(self, **kwargs) -> ToolResult:
        """Execute the tool with runtime tracking and exception safety."""
        start_time = time.perf_counter()
        try:
            if inspect.iscoroutinefunction(self.execute):
                result_data = await self.execute(**kwargs)
            else:
                result_data = self.execute(**kwargs)

            elapsed_ms = (time.perf_counter() - start_time) * 1000.0
            if isinstance(result_data, ToolResult):
                result_data.execution_time_ms = elapsed_ms
                result_data.tool_name = self.name
                return result_data

            return ToolResult(
                success=True,
                data=result_data if isinstance(result_data, dict) else {"result": result_data},
                execution_time_ms=elapsed_ms,
                tool_name=self.name
            )
        except Exception as e:
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0
            return ToolResult(
                success=False,
                data={},
                error=str(e),
                execution_time_ms=elapsed_ms,
                tool_name=self.name
            )

    @abstractmethod
    async def execute(self, **kwargs) -> Any:
        """Concrete tool logic to be implemented by child classes."""
        pass
