"""Prompt-injection sanitization with an optional crystal-shield backend."""

from __future__ import annotations

import re

_BLOCKED = "[crystal-mind blocked potentially hostile instructions in this file]"
_FALLBACK_PATTERNS = tuple(
    re.compile(pattern, re.IGNORECASE | re.DOTALL)
    for pattern in (
        r"ignore\s+(all\s+)?previous\s+instructions?",
        r"reveal\s+(your\s+)?system\s+prompt",
        r"repeat\s+(your\s+)?system\s+prompt",
        r"you\s+are\s+now\s+(dan|developer\s+mode)",
        r"<\|(?:im_start|system|assistant)\|>",
        r"\[INST\]",
        r"(?:end|start)\s+of\s+(?:system\s+)?(?:prompt|context)",
    )
)


def sanitize(source: str, content: str) -> str:
    """Return safe content, preferring crystal-shield when it is installed."""
    try:
        from crystal_shield import ShieldMiddleware  # type: ignore[import-not-found,import-untyped]
        from crystal_shield.policy import ShieldBlockedError  # type: ignore[import-not-found,import-untyped]
    except ImportError:
        return _fallback_sanitize(content)

    try:
        return ShieldMiddleware().wrap_tool_output(source, content)
    except ShieldBlockedError as exc:
        return f"[crystal-shield blocked this file's content: {exc.report.summary}]"


def _fallback_sanitize(content: str) -> str:
    if any(pattern.search(content) for pattern in _FALLBACK_PATTERNS):
        return _BLOCKED
    return content
