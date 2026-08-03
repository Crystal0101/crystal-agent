"""
Decorator API for defining MCP tools, resources, and prompts.
"""

from __future__ import annotations

import functools
import inspect
from typing import Any, Callable, get_type_hints


_REGISTRY: dict[str, dict] = {"tools": {}, "resources": {}, "prompts": {}}


def _python_type_to_json_schema(annotation: Any) -> dict:
    origin = getattr(annotation, "__origin__", None)
    if annotation is str or annotation is inspect.Parameter.empty:
        return {"type": "string"}
    if annotation is int:
        return {"type": "integer"}
    if annotation is float:
        return {"type": "number"}
    if annotation is bool:
        return {"type": "boolean"}
    if annotation is list or origin is list:
        return {"type": "array", "items": {"type": "string"}}
    return {"type": "string"}


def tool(
    name: str | None = None,
    description: str = "",
    schema: dict | None = None,
):
    """
    Decorator to register a Python function as an MCP tool.

    Example::

        @tool(description="Search the web for a query")
        def web_search(query: str, max_results: int = 5) -> ToolResult:
            ...
    """
    def decorator(fn: Callable) -> Callable:
        tool_name = name or fn.__name__
        hints = get_type_hints(fn)
        sig = inspect.signature(fn)

        input_schema = schema or {
            "type": "object",
            "properties": {
                param: _python_type_to_json_schema(hints.get(param, str))
                for param in sig.parameters
            },
            "required": [
                p for p, v in sig.parameters.items()
                if v.default is inspect.Parameter.empty
            ],
        }

        _REGISTRY["tools"][tool_name] = {
            "name": tool_name,
            "description": description or (fn.__doc__ or "").strip(),
            "inputSchema": input_schema,
            "fn": fn,
        }

        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            return fn(*args, **kwargs)

        setattr(wrapper, "_mcp_tool", tool_name)
        return wrapper

    return decorator


def resource(uri_template: str, description: str = "", mime_type: str = "text/plain"):
    """
    Register a Python function as an MCP resource provider.

    Example::

        @resource("file://{path}", description="Read a local file")
        def read_file(path: str) -> ResourceContent:
            ...
    """
    def decorator(fn: Callable) -> Callable:
        _REGISTRY["resources"][uri_template] = {
            "uriTemplate": uri_template,
            "description": description or (fn.__doc__ or "").strip(),
            "mimeType": mime_type,
            "fn": fn,
        }

        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            return fn(*args, **kwargs)

        setattr(wrapper, "_mcp_resource", uri_template)
        return wrapper

    return decorator


def prompt(name: str | None = None, description: str = ""):
    """
    Register a Python function as an MCP prompt template.

    Example::

        @prompt(description="Generate a code review prompt")
        def code_review(code: str, language: str = "python") -> list[PromptMessage]:
            ...
    """
    def decorator(fn: Callable) -> Callable:
        prompt_name = name or fn.__name__
        sig = inspect.signature(fn)

        _REGISTRY["prompts"][prompt_name] = {
            "name": prompt_name,
            "description": description or (fn.__doc__ or "").strip(),
            "arguments": [
                {
                    "name": p,
                    "description": "",
                    "required": v.default is inspect.Parameter.empty,
                }
                for p, v in sig.parameters.items()
            ],
            "fn": fn,
        }

        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            return fn(*args, **kwargs)

        setattr(wrapper, "_mcp_prompt", prompt_name)
        return wrapper

    return decorator


def get_registry() -> dict:
    return _REGISTRY
