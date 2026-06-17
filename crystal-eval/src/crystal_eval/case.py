from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable


class Verdict(Enum):
    PASS = "pass"
    FAIL = "fail"
    SKIP = "skip"
    ERROR = "error"


@dataclass
class EvalCase:
    """A single evaluation case."""
    id: str
    description: str
    category: str                       # e.g. "security", "capability", "robustness"
    input: dict[str, Any]               # inputs passed to the agent/fn under test
    expected: Any | None = None         # expected output (for exact match)
    judge: Callable[[Any, Any], bool] | None = None  # custom judge fn(actual, expected) -> bool
    tags: list[str] = field(default_factory=list)
    timeout: float = 30.0
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class EvalResult:
    case: EvalCase
    actual: Any
    verdict: Verdict
    score: float                        # 0.0 – 1.0
    latency_ms: float
    error: str | None = None
    notes: str = ""

    @property
    def passed(self) -> bool:
        return self.verdict == Verdict.PASS
