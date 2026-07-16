"""
Plan data model — structured action list with risk classification.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
import json
from pathlib import Path
from typing import Any


class ActionType(str, Enum):
    CREATE_DIR   = "create_dir"
    MOVE_FILE    = "move_file"
    WRITE_FILE   = "write_file"    # create or overwrite a file
    ARCHIVE      = "archive"       # move to an archive subdirectory
    DELETE       = "delete"        # HIGH RISK — requires confirmation
    EXTERNAL     = "external"      # send email, push to remote — requires confirmation
    REPORT       = "report"        # generate a summary/report file (safe)
    NOTE         = "note"          # informational only, no file change


class Risk(str, Enum):
    LOW  = "low"    # auto-execute
    HIGH = "high"   # pause and confirm


@dataclass
class Action:
    type: ActionType
    description: str
    params: dict = field(default_factory=dict)
    risk: Risk = Risk.LOW
    done: bool = False
    result: str = ""

    @property
    def needs_confirm(self) -> bool:
        return self.risk == Risk.HIGH


@dataclass
class Plan:
    goal: str
    actions: list[Action] = field(default_factory=list)
    reasoning: str = ""
    allowed_roots: list[str] = field(default_factory=list)  # sandbox: actions outside these are refused

    def to_dict(self) -> dict[str, Any]:
        return {
            "schema_version": 1,
            "goal": self.goal,
            "reasoning": self.reasoning,
            "allowed_roots": self.allowed_roots,
            "actions": [
                {
                    "type": action.type.value,
                    "description": action.description,
                    "params": action.params,
                    "risk": action.risk.value,
                }
                for action in self.actions
            ],
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Plan":
        if data.get("schema_version", 1) != 1:
            raise ValueError("Unsupported plan schema_version")
        goal = data.get("goal")
        actions_data = data.get("actions")
        roots = data.get("allowed_roots")
        if not isinstance(goal, str) or not goal.strip():
            raise ValueError("Plan goal must be a non-empty string")
        if not isinstance(actions_data, list):
            raise ValueError("Plan actions must be a list")
        if not isinstance(roots, list) or not roots or not all(isinstance(r, str) for r in roots):
            raise ValueError("Plan allowed_roots must be a non-empty list of paths")

        actions: list[Action] = []
        for index, raw in enumerate(actions_data, 1):
            if not isinstance(raw, dict):
                raise ValueError(f"Action {index} must be an object")
            try:
                action_type = ActionType(raw["type"])
                description = raw["description"]
                params = raw.get("params", {})
            except (KeyError, ValueError) as exc:
                raise ValueError(f"Invalid action {index}: {exc}") from exc
            if not isinstance(description, str) or not description.strip():
                raise ValueError(f"Action {index} description must be non-empty")
            if not isinstance(params, dict):
                raise ValueError(f"Action {index} params must be an object")
            supplied_risk = Risk(raw.get("risk", "low"))
            # Never trust an LLM or edited JSON file to downgrade destructive actions.
            risk = Risk.HIGH if action_type in {ActionType.DELETE, ActionType.EXTERNAL} else supplied_risk
            actions.append(Action(action_type, description, params, risk))

        return cls(
            goal=goal.strip(),
            actions=actions,
            reasoning=str(data.get("reasoning", "")),
            allowed_roots=roots,
        )

    def save(self, path: str | Path) -> Path:
        destination = Path(path).expanduser()
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(json.dumps(self.to_dict(), indent=2, ensure_ascii=False), encoding="utf-8")
        return destination

    @classmethod
    def load(cls, path: str | Path) -> "Plan":
        source = Path(path).expanduser()
        try:
            data = json.loads(source.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise ValueError(f"Invalid plan JSON: {exc}") from exc
        if not isinstance(data, dict):
            raise ValueError("Plan JSON must contain an object")
        return cls.from_dict(data)

    def low_risk(self) -> list[Action]:
        return [a for a in self.actions if a.risk == Risk.LOW]

    def high_risk(self) -> list[Action]:
        return [a for a in self.actions if a.risk == Risk.HIGH]

    def summary(self) -> str:
        low = len(self.low_risk())
        high = len(self.high_risk())
        return (
            f"Plan for: {self.goal}\n"
            f"  {low} auto-execute actions\n"
            f"  {high} actions requiring confirmation\n"
            f"Reasoning: {self.reasoning[:300]}"
        )
