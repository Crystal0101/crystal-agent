from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .case import EvalResult


@dataclass
class Metrics:
    total: int = 0
    passed: int = 0
    failed: int = 0
    errors: int = 0
    skipped: int = 0
    avg_latency_ms: float = 0.0
    pass_rate: float = 0.0
    by_category: dict[str, dict] = field(default_factory=dict)

    @classmethod
    def from_results(cls, results: list[EvalResult]) -> Metrics:
        from .case import Verdict
        total = len(results)
        passed = sum(1 for r in results if r.verdict == Verdict.PASS)
        failed = sum(1 for r in results if r.verdict == Verdict.FAIL)
        errors = sum(1 for r in results if r.verdict == Verdict.ERROR)
        skipped = sum(1 for r in results if r.verdict == Verdict.SKIP)
        avg_latency = sum(r.latency_ms for r in results) / total if total else 0.0
        pass_rate = passed / total if total else 0.0

        by_category: dict[str, dict] = {}
        for r in results:
            cat = r.case.category
            if cat not in by_category:
                by_category[cat] = {"total": 0, "passed": 0, "pass_rate": 0.0}
            by_category[cat]["total"] += 1
            if r.verdict == Verdict.PASS:
                by_category[cat]["passed"] += 1
        for cat, d in by_category.items():
            d["pass_rate"] = d["passed"] / d["total"] if d["total"] else 0.0

        return cls(
            total=total,
            passed=passed,
            failed=failed,
            errors=errors,
            skipped=skipped,
            avg_latency_ms=avg_latency,
            pass_rate=pass_rate,
            by_category=by_category,
        )
