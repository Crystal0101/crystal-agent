"""
Planning engine — sends user profile to Claude and parses a structured action plan.
"""

from __future__ import annotations

import json
import os

import anthropic

from ..profiler.builder import UserProfile
from .plan import Action, ActionType, Plan, Risk

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
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    context = profile.to_context_str()

    message = client.messages.create(
        model=model,
        max_tokens=8192,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": context}],
    )

    if message.stop_reason == "max_tokens":
        raise RuntimeError(
            "Claude response was cut off (max_tokens reached). "
            "Try a smaller data_root or increase max_tokens further."
        )

    raw = message.content[0].text.strip()

    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError(f"Claude returned invalid JSON: {e}\n\nRaw response (first 500 chars):\n{raw[:500]}") from e
    actions = [
        Action(
            type=ActionType(a["type"]),
            description=a["description"],
            risk=Risk(a.get("risk", "low")),
            params=a.get("params", {}),
        )
        for a in data["actions"]
    ]
    return Plan(goal=profile.goal, actions=actions, reasoning=data.get("reasoning", ""))
