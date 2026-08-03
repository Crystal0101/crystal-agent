from __future__ import annotations

import concurrent.futures

from .case import EvalResult
from .report import EvalReport
from .suite import EvalSuite


class EvalRunner:
    """
    Execute eval suites, collect results, produce reports.

    Example::

        runner = EvalRunner(workers=4)
        report = runner.run(suite)
        report.print_summary()
        report.save("results.json")
    """

    def __init__(self, workers: int = 1, verbose: bool = True) -> None:
        self.workers = workers
        self.verbose = verbose

    def run(self, suite: EvalSuite) -> EvalReport:
        results: list[EvalResult] = []

        if self.workers == 1:
            for case, fn in suite.cases:
                result = suite.run_case(case, fn)
                results.append(result)
                if self.verbose:
                    icon = "✅" if result.passed else ("⚠️" if result.verdict.value == "error" else "❌")
                    print(f"  {icon} [{case.id}] {case.description[:60]} ({result.latency_ms:.0f}ms)")
        else:
            with concurrent.futures.ThreadPoolExecutor(max_workers=self.workers) as pool:
                futures = {pool.submit(suite.run_case, case, fn): case for case, fn in suite.cases}
                for future in concurrent.futures.as_completed(futures):
                    result = future.result()
                    results.append(result)
                    if self.verbose:
                        icon = "✅" if result.passed else "❌"
                        print(f"  {icon} [{result.case.id}] {result.case.description[:60]}")

        return EvalReport(suite_name=suite.name, results=results)
