from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any


@dataclass
class ToolResult:
    content: str
    is_error: bool = False
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_mcp(self) -> dict:
        return {
            "content": [{"type": "text", "text": self.content}],
            "isError": self.is_error,
        }


@dataclass
class ResourceContent:
    uri: str
    text: str
    mime_type: str = "text/plain"

    def to_mcp(self) -> dict:
        return {
            "uri": self.uri,
            "mimeType": self.mime_type,
            "text": self.text,
        }


@dataclass
class PromptMessage:
    role: str
    content: str

    def to_mcp(self) -> dict:
        return {"role": self.role, "content": {"type": "text", "text": self.content}}
