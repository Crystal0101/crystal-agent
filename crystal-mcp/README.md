# crystal-mcp

**Zero-boilerplate MCP (Model Context Protocol) server toolkit.**

[![PyPI](https://img.shields.io/pypi/v/crystal-mcp)](https://pypi.org/project/crystal-mcp/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Build and ship MCP servers in minutes with a clean decorator API. Compatible with Claude Desktop, Cursor, and any MCP client.

## Install

```bash
pip install crystal-mcp
```

## Quick Start

```python
# server.py
from crystal_mcp import MCPServer, tool, resource, prompt
from crystal_mcp.types import ToolResult, ResourceContent, PromptMessage
import httpx

server = MCPServer(name="my-server", version="1.0.0")


@tool(description="Fetch the content of a URL")
def fetch_url(url: str) -> ToolResult:
    response = httpx.get(url, timeout=10)
    return ToolResult(content=response.text[:4000])


@tool(description="Add two numbers")
def add(a: int, b: int) -> ToolResult:
    return ToolResult(content=str(a + b))


@resource("file://{path}", description="Read a local file")
def read_file(path: str) -> ResourceContent:
    text = open(path).read()
    return ResourceContent(uri=f"file://{path}", text=text)


@prompt(description="Generate a code review prompt")
def code_review(code: str, language: str = "python") -> list[PromptMessage]:
    return [
        PromptMessage(role="user", content=f"Review this {language} code:\n\n```{language}\n{code}\n```"),
    ]


if __name__ == "__main__":
    server.run()
```

## Connect to Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "my-server": {
      "command": "python",
      "args": ["/path/to/server.py"]
    }
  }
}
```

## API Reference

### `@tool(description, schema?)`

Register a Python function as an MCP tool. Input schema is auto-generated from type hints.

### `@resource(uri_template, description?, mime_type?)`

Register a resource provider. The function receives the requested URI.

### `@prompt(name?, description?)`

Register a prompt template. Return `list[PromptMessage]` or a string.

### `MCPServer(name, version)`

The server instance. Call `.run()` to start the stdio server.

## License

MIT
