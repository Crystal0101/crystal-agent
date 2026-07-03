from __future__ import annotations
from dataclasses import dataclass
from pathlib import Path


@dataclass
class UserIntent:
    who: str
    data_roots: list[Path]
    goal: str
