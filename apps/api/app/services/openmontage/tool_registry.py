"""
OpenMontage Tool Registry for ViraLoop Studio.
Maintains all active capability-first tools and routes execution dynamically.
"""

import logging
from typing import Dict, Any, List, Optional
from app.services.openmontage.base_tool import BaseTool, ToolResult

logger = logging.getLogger("openmontage_registry")


class ToolRegistry:
    """
    Capability-first Tool Registry.
    Tools register under one or more capabilities (tts, video_analyze, compose, etc.).
    """

    def __init__(self):
        self._tools: Dict[str, BaseTool] = {}
        self._capability_map: Dict[str, List[str]] = {}

    def register(self, tool: BaseTool) -> None:
        """Register a new tool instance."""
        self._tools[tool.name] = tool
        for cap in tool.capabilities:
            if cap not in self._capability_map:
                self._capability_map[cap] = []
            if tool.name not in self._capability_map[cap]:
                self._capability_map[cap].append(tool.name)
        logger.info(f"Registered OpenMontage tool: {tool.name} (capabilities: {tool.capabilities})")

    def get_tool(self, name: str) -> Optional[BaseTool]:
        """Get a tool by its exact name."""
        return self._tools.get(name)

    def get_tools_by_capability(self, capability: str) -> List[BaseTool]:
        """Find all registered tools matching a capability."""
        tool_names = self._capability_map.get(capability, [])
        return [self._tools[name] for name in tool_names if name in self._tools]

    def list_tools(self) -> List[Dict[str, Any]]:
        """List all registered tools with MCP descriptor metadata."""
        return [tool.to_mcp_descriptor() for tool in self._tools.values()]

    def list_capabilities(self) -> Dict[str, List[str]]:
        """List all capabilities and their providing tools."""
        return dict(self._capability_map)

    async def execute_tool(self, tool_name: str, **kwargs) -> ToolResult:
        """Execute a tool by name with parameter forwarding."""
        tool = self.get_tool(tool_name)
        if not tool:
            return ToolResult(
                success=False,
                error=f"Tool '{tool_name}' not found in OpenMontage registry",
                tool_name=tool_name
            )
        return await tool.run(**kwargs)


# Global Singleton Registry
openmontage_registry = ToolRegistry()
