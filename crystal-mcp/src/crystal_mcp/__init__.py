"""
crystal-mcp: Zero-boilerplate MCP (Model Context Protocol) server toolkit.
Build and deploy MCP servers in minutes.
"""

from .server import MCPServer
from .tool import tool, resource, prompt
from .types import ToolResult, ResourceContent, PromptMessage

__version__ = "0.1.0"
__all__ = ["MCPServer", "tool", "resource", "prompt", "ToolResult", "ResourceContent", "PromptMessage"]
