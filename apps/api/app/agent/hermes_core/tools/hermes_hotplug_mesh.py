"""
Live Hot-Plug Tool Mesh.
=========================
Ported & adapted from Nous Research Hermes Agent v0.21.5:
- Connectors Architecture & Live Plugin Integration
- acp_adapter/tools.py & hermes_tools_mcp_server.py

Enables runtime dynamic registration and injection of tools into active Hermes sessions
WITHOUT restarting the desktop app or backend server:
1. Dynamic Schema Injection into HERMES_OPENAI_TOOLS & Gemini Declarations
2. In-Memory Execution Handler Binding into HermesToolDispatcher
3. Live Domain Categorization into TOOL_DOMAINS
4. Safe Unplugging & Lifecycle Management
"""

import logging
import threading
from typing import Dict, Any, Callable, Optional, List, Awaitable

logger = logging.getLogger("hermes_hotplug_mesh")


class LiveHotPlugToolMesh:
    """
    Registry for dynamically injected runtime tools and extensions.
    """

    def __init__(self):
        self._lock = threading.Lock()
        # tool_name -> callable(args: Dict[str, Any]) -> Awaitable[Dict[str, Any]]
        self._custom_handlers: Dict[str, Callable[[Dict[str, Any]], Awaitable[Dict[str, Any]]]] = {}
        # tool_name -> metadata dict
        self._tool_metadata: Dict[str, Dict[str, Any]] = {}

    def hotplug_tool(
        self,
        tool_schema: Dict[str, Any],
        handler: Callable[[Dict[str, Any]], Awaitable[Dict[str, Any]]],
        domain: str = "VISUAL_SYNTHESIS",
        author: str = "custom"
    ) -> bool:
        """
        Hot-plugs a new tool into Hermes tool registry live without restarting.
        """
        try:
            fn = tool_schema.get("function", {})
            tool_name = fn.get("name")
            if not tool_name:
                raise ValueError("tool_schema must have 'function.name'")

            with self._lock:
                from app.agent.hermes_core.tools.hermes_tool_registry import (
                    HERMES_OPENAI_TOOLS,
                    TOOL_DOMAINS
                )

                # 1. Register or update OpenAI tool schema
                existing_idx = None
                for i, t in enumerate(HERMES_OPENAI_TOOLS):
                    if t.get("function", {}).get("name") == tool_name:
                        existing_idx = i
                        break

                if existing_idx is not None:
                    HERMES_OPENAI_TOOLS[existing_idx] = tool_schema
                else:
                    HERMES_OPENAI_TOOLS.append(tool_schema)

                # 2. Add to Domain
                domain_tools = TOOL_DOMAINS.setdefault(domain, [])
                if tool_name not in domain_tools:
                    domain_tools.append(tool_name)

                # 3. Bind execution handler
                self._custom_handlers[tool_name] = handler
                self._tool_metadata[tool_name] = {
                    "name": tool_name,
                    "domain": domain,
                    "author": author,
                    "description": fn.get("description", ""),
                    "is_hotplugged": True
                }

            logger.info(f"🔌 [LiveToolMesh] Successfully hot-plugged tool '{tool_name}' into domain '{domain}'")
            return True
        except Exception as e:
            logger.error(f"Failed to hot-plug tool: {e}")
            return False

    def unplug_tool(self, tool_name: str) -> bool:
        """Removes a hot-plugged tool from the registry."""
        with self._lock:
            from app.agent.hermes_core.tools.hermes_tool_registry import (
                HERMES_OPENAI_TOOLS,
                TOOL_DOMAINS
            )

            # Remove from schema list
            HERMES_OPENAI_TOOLS[:] = [
                t for t in HERMES_OPENAI_TOOLS if t.get("function", {}).get("name") != tool_name
            ]

            # Remove from domains
            for d, tools in TOOL_DOMAINS.items():
                if tool_name in tools:
                    tools.remove(tool_name)

            self._custom_handlers.pop(tool_name, None)
            self._tool_metadata.pop(tool_name, None)

        logger.info(f"🔌 [LiveToolMesh] Unplugged tool '{tool_name}'")
        return True

    def has_handler(self, tool_name: str) -> bool:
        with self._lock:
            return tool_name in self._custom_handlers

    async def execute_custom(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Executes a hot-plugged custom tool handler."""
        with self._lock:
            handler = self._custom_handlers.get(tool_name)

        if not handler:
            return {"success": False, "error": f"No custom handler registered for '{tool_name}'"}

        try:
            res = await handler(arguments)
            return res
        except Exception as e:
            logger.error(f"Error in hot-plugged tool '{tool_name}': {e}", exc_info=True)
            return {"success": False, "error": str(e)}

    def list_hotplugged_tools(self) -> List[Dict[str, Any]]:
        with self._lock:
            return list(self._tool_metadata.values())


hermes_hotplug_mesh = LiveHotPlugToolMesh()
