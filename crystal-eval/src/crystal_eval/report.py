from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING

from .metrics import Metrics

if TYPE_CHECKING:
    from .case import EvalResult


@dataclass
class EvalReport:
    suite_name: str
    results: list[EvalResult]

    @property
    def metrics(self) -> Metrics:
        return Metrics.from_results(self.results)

    def print_summary(self) -> None:
        m = self.metrics
        print(f"\n{'─'*50}")
        print(f"  crystal-eval · {self.suite_name}")
        print(f"{'─'*50}")
        print(f"  Total:   {m.total}")
        print(f"  ✅ Pass:  {m.passed}  ({m.pass_rate*100:.1f}%)")
        print(f"  ❌ Fail:  {m.failed}")
        print(f"  ⚠️  Error: {m.errors}")
        print(f"  ⏱  Avg latency: {m.avg_latency_ms:.0f}ms")
        if m.by_category:
            print("\n  By category:")
            for cat, d in sorted(m.by_category.items()):
                print(f"    {cat:<20} {d['passed']}/{d['total']}  ({d['pass_rate']*100:.0f}%)")
        print(f"{'─'*50}\n")

    def to_dict(self) -> dict:
        m = self.metrics
        return {
            "suite": self.suite_name,
            "metrics": {
                "total": m.total,
                "passed": m.passed,
                "failed": m.failed,
                "errors": m.errors,
                "pass_rate": round(m.pass_rate, 4),
                "avg_latency_ms": round(m.avg_latency_ms, 2),
                "by_category": m.by_category,
            },
            "results": [
                {
                    "id": r.case.id,
                    "description": r.case.description,
                    "category": r.case.category,
                    "verdict": r.verdict.value,
                    "score": r.score,
                    "latency_ms": round(r.latency_ms, 2),
                    "error": r.error,
                }
                for r in self.results
            ],
        }

    def save(self, path: str | Path) -> None:
        Path(path).write_text(json.dumps(self.to_dict(), indent=2, ensure_ascii=False))
        print(f"[crystal-eval] Report saved to {path}")
