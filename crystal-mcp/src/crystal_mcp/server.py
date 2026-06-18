"""
MCPServer — stdio transport implementation of the MCP spec.
"""

from __future__ import annotations

import asyncio
import json
import sys
from typing import Any

from .tool import get_registry
from .types import ToolResult, ResourceContent, PromptMessage


class MCPServer:
    """
    Lightweight MCP server with stdio transport.

    Usage::

        from crystal_mcp import MCPServer, tool

        server = MCPServer(name="my-server", version="1.0.0")

        @tool(description="Add two numbers")
        def add(a: int, b: int) -> ToolResult:
            return ToolResult(content=str(a + b))

        if __name__ == "__main__":
            server.run()
    """

    def __init__(self, name: str = "crystal-mcp-server", version: str = "0.1.0") -> None:
        self.name = name
        self.version = version
        self._registry = get_registry()
        self._request_id: int = 0

    # ── Public API ────────────────────────────────────────────────────────────

    def run(self) -> None:
        """Start the MCP server (blocking, reads from stdin)."""
        asyncio.run(self._run_stdio())

    # ── Protocol handlers ─────────────────────────────────────────────────────

    async def _run_stdio(self) -> None:
        reader = asyncio.StreamReader()
        protocol = asyncio.StreamReaderProtocol(reader)
        loop = asyncio.get_event_loop()
        await loop.connect_read_pipe(lambda: protocol, sys.stdin)

        while True:
            try:
                line = await reader.readline()
                if not line:
                    break
                request = json.loads(line.decode())
                response = await self._handle(request)
                if response is not None:
                    sys.stdout.write(json.dumps(response) + "\n")
                    sys.stdout.flush()
            except (json.JSONDecodeError, EOFError):
                break

    async def _handle(self, req: dict) -> dict | None:
        method = req.get("method", "")
        req_id = req.get("id")
        params = req.get("params", {})

        handlers = {
            "initialize": self._handle_initialize,
            "tools/list": self._handle_tools_list,
            "tools/call": self._handle_tools_call,
            "resources/list": self._handle_resources_list,
            "resources/read": self._handle_resources_read,
            "prompts/list": self._handle_prompts_list,
            "prompts/get": self._handle_prompts_get,
        }

        handler = handlers.get(method)
        if handler is None:
            if req_id is not None:
                return self._error(req_id, -32601, f"Method not found: {method}")
            return None

        try:
            result = await handler(params)
            if req_id is not None:
                return {"jsonrpc": "2.0", "id": req_id, "result": result}
            return None
        except Exception as e:
            if req_id is not None:
                return self._error(req_id, -32603, str(e))
            return None

    async def _handle_initialize(self, params: dict) -> dict:
        return {
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "tools": {"listChanged": False},
                "resources": {"subscribe": False, "listChanged": False},
                "prompts": {"listChanged": False},
            },
            "serverInfo": {"name": self.name, "version": self.version},
        }

    async def _handle_tools_list(self, params: dict) -> dict:
        tools = [
            {"name": t["name"], "description": t["description"], "inputSchema": t["inputSchema"]}
            for t in self._registry["tools"].values()
        ]
        return {"tools": tools}

    async def _handle_tools_call(self, params: dict) -> dict:
        name = params.get("name")
        args = params.get("arguments", {})
        entry = self._registry["tools"].get(name)
        if not entry:
            raise ValueError(f"Unknown tool: {name}")
        result = entry["fn"](**args)
        if isinstance(result, ToolResult):
            return result.to_mcp()
        return ToolResult(content=str(result)).to_mcp()

    async def _handle_resources_list(self, params: dict) -> dict:
        resources = [
            {"uri": r["uriTemplate"], "name": r["uriTemplate"], "description": r["description"], "mimeType": r["mimeType"]}
            for r in self._registry["resources"].values()
        ]
        return {"resources": resources}

    async def _handle_resources_read(self, params: dict) -> dict:
        uri = params.get("uri", "")
        for template, entry in self._registry["resources"].items():
            result = entry["fn"](uri)
            if isinstance(result, ResourceContent):
                return {"contents": [result.to_mcp()]}
        raise ValueError(f"No resource handler for URI: {uri}")

    async def _handle_prompts_list(self, params: dict) -> dict:
        prompts = [
            {"name": p["name"], "description": p["description"], "arguments": p["arguments"]}
            for p in self._registry["prompts"].values()
        ]
        return {"prompts": prompts}

    async def _handle_prompts_get(self, params: dict) -> dict:
        name = params.get("name")
        args = params.get("arguments", {})
        entry = self._registry["prompts"].get(name)
        if not entry:
            raise ValueError(f"Unknown prompt: {name}")
        result = entry["fn"](**args)
        if isinstance(result, list):
            messages = [m.to_mcp() if isinstance(m, PromptMessage) else m for m in result]
        else:
            messages = [PromptMessage(role="user", content=str(result)).to_mcp()]
        return {"description": entry["description"], "messages": messages}

    def _error(self, req_id: Any, code: int, message: str) -> dict:
        return {"jsonrpc": "2.0", "id": req_id, "error": {"code": code, "message": message}}
