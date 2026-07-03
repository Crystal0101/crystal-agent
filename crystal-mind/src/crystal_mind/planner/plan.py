"""
Plan data model — structured action list with risk classification.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


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
