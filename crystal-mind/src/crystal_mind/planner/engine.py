"""
Planning engine — sends user profile to Claude and parses a structured action plan.
"""

from __future__ import annotations

import json
import os
import time

import anthropic

from ..profiler.builder import UserProfile
from .plan import Plan

_RETRY_EXCEPTIONS = (
    anthropic.APIConnectionError,
    anthropic.RateLimitError,
    anthropic.InternalServerError,
)
_MAX_RETRIES = 3
_RETRY_BASE_DELAY = 2.0  # seconds; doubles each attempt

SYSTEM_PROMPT = """You are crystal-mind, a personal AI planning system.

You receive a complete profile of the user: who they are, what data they have, and what they want to achieve.
Your job is to generate a concrete, fully executable action plan.

Rules:
- Be decisive. Generate a complete plan, not a list of suggestions.
- Prefer creating structure (directories, index files, META files) over deleting.
- Mark DELETE or EXTERNAL actions as high-risk. Everything else is low-risk.
- Each action must be atomic and independently executable.

Respond with ONLY valid JSON in this exact format:
{
  "reasoning": "2-3 sentences explaining your strategy",
  "actions": [
    {
      "type": "create_dir|move_file|write_file|archive|delete|external|report|note",
      "description": "human-readable explanation",
      "risk": "low|high",
      "params": {
        // for create_dir: {"path": "..."}
        // for move_file:  {"src": "...", "dst": "..."}
        // for write_file: {"path": "...", "content": "..."}
        // for archive:    {"src": "...", "archive_dir": "..."}
        // for delete:     {"path": "..."}
        // for report:     {"path": "...", "content": "..."}
        // for note:       {"message": "..."}
      }
    }
  ]
}"""


def generate(profile: UserProfile, model: str = "claude-sonnet-4-6") -> Plan:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is not configured")
    client = anthropic.Anthropic(api_key=api_key, timeout=60.0, max_retries=0)

    context = profile.to_context_str()

    for attempt in range(1, _MAX_RETRIES + 1):
        try:
            message = client.messages.create(
                model=model,
                max_tokens=8192,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": context}],
            )
            break
        except _RETRY_EXCEPTIONS as exc:
            if attempt == _MAX_RETRIES:
                raise RuntimeError(
                    f"Claude API failed after {_MAX_RETRIES} attempts: {exc}"
                ) from exc
            delay = _RETRY_BASE_DELAY * (2 ** (attempt - 1))
            print(f"  [retry {attempt}/{_MAX_RETRIES}] API error: {exc}. Retrying in {delay:.0f}s...")
            time.sleep(delay)

    if message.stop_reason == "max_tokens":
        raise RuntimeError(
            "Claude response was cut off (max_tokens reached). "
            "Try a smaller data_root or increase max_tokens further."
        )

    text_blocks = [
        block for block in message.content
        if isinstance(block, anthropic.types.TextBlock)
    ]
    if not text_blocks:
        raise RuntimeError("Claude response contained no text block to parse.")
    raw = text_blocks[0].text.strip()

    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError(f"Claude returned invalid JSON: {e}\n\nRaw response (first 500 chars):\n{raw[:500]}") from e
    if not isinstance(data, dict):
        raise ValueError("Claude returned JSON that is not an object")
    data["goal"] = profile.goal
    data["allowed_roots"] = profile.data_roots
    try:
        return Plan.from_dict(data)
    except (KeyError, TypeError, ValueError) as exc:
        raise ValueError(f"Claude returned an invalid plan: {exc}") from exc
