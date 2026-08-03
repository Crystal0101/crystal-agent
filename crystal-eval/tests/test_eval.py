"""Tests for crystal-eval: EvalCase, EvalSuite, EvalRunner, Metrics, EvalReport."""

import json
import sys
import os
import tempfile

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from crystal_eval import EvalRunner, EvalSuite, EvalCase, Verdict, Metrics, EvalReport


# ── EvalCase ──────────────────────────────────────────────────────────────────

class TestEvalCase:
    def test_basic_fields(self):
        case = EvalCase(
            id="c-001",
            description="Test addition",
            category="math",
            input={"a": 1, "b": 2},
            expected=3,
        )
        assert case.id == "c-001"
        assert case.category == "math"
        assert case.input == {"a": 1, "b": 2}
        assert case.expected == 3

    def test_defaults(self):
        case = EvalCase(id="x", description="d", category="c", input={})
        assert case.judge is None
        assert case.expected is None
        assert case.tags == []
        assert case.timeout == 30.0


# ── EvalSuite ─────────────────────────────────────────────────────────────────

class TestEvalSuite:
    def test_case_decorator_adds_to_suite(self):
        suite = EvalSuite(name="demo")

        @suite.case(
            id="s-001",
            description="Trivial pass",
            category="unit",
            input={"x": 1},
            expected=1,
        )
        def fn(input, expected):
            return input["x"]

        assert len(suite.cases) == 1
        assert suite.cases[0][0].id == "s-001"

    def test_add_method(self):
        suite = EvalSuite(name="manual")
        case = EvalCase(id="m-001", description="manual", category="unit", input={})
        suite.add(case, lambda i, e: None)
        assert len(suite.cases) == 1

    def test_run_case_pass(self):
        suite = EvalSuite(name="s")
        case = EvalCase(id="p-001", description="pass", category="unit", input={"v": 42}, expected=42)
        result = suite.run_case(case, lambda inp, exp: inp["v"])
        assert result.verdict == Verdict.PASS
        assert result.score == 1.0
        assert result.passed is True

    def test_run_case_fail(self):
        suite = EvalSuite(name="s")
        case = EvalCase(id="f-001", description="fail", category="unit", input={"v": 1}, expected=99)
        result = suite.run_case(case, lambda inp, exp: inp["v"])
        assert result.verdict == Verdict.FAIL
        assert result.score == 0.0
        assert result.passed is False

    def test_run_case_error(self):
        suite = EvalSuite(name="s")
        case = EvalCase(id="e-001", description="error", category="unit", input={})

        def boom(inp, exp):
            raise RuntimeError("intentional error")

        result = suite.run_case(case, boom)
        assert result.verdict == Verdict.ERROR
        assert "intentional error" in result.error
        assert result.passed is False

    def test_run_case_custom_judge(self):
        suite = EvalSuite(name="s")
        case = EvalCase(
            id="j-001",
            description="judge",
            category="unit",
            input={"text": "hello world"},
            expected="hello",
            judge=lambda actual, expected: expected in actual,
        )
        result = suite.run_case(case, lambda inp, exp: inp["text"])
        assert result.verdict == Verdict.PASS

    def test_run_case_no_expected_passes_if_not_none(self):
        suite = EvalSuite(name="s")
        case = EvalCase(id="n-001", description="no expected", category="unit", input={})
        result = suite.run_case(case, lambda inp, exp: "some output")
        assert result.verdict == Verdict.PASS

    def test_latency_recorded(self):
        suite = EvalSuite(name="s")
        case = EvalCase(id="l-001", description="latency", category="unit", input={})
        result = suite.run_case(case, lambda inp, exp: "ok")
        assert result.latency_ms >= 0.0


# ── EvalRunner ────────────────────────────────────────────────────────────────

class TestEvalRunner:
    def _make_suite(self) -> EvalSuite:
        suite = EvalSuite(name="runner-test")

        @suite.case(id="r-001", description="pass case", category="unit", input={"n": 5}, expected=5)
        def fn1(inp, exp):
            return inp["n"]

        @suite.case(id="r-002", description="fail case", category="unit", input={"n": 3}, expected=99)
        def fn2(inp, exp):
            return inp["n"]

        @suite.case(id="r-003", description="error case", category="security", input={})
        def fn3(inp, exp):
            raise ValueError("boom")

        return suite

    def test_single_worker_run(self):
        runner = EvalRunner(workers=1, verbose=False)
        report = runner.run(self._make_suite())
        assert len(report.results) == 3
        passed = [r for r in report.results if r.verdict == Verdict.PASS]
        failed = [r for r in report.results if r.verdict == Verdict.FAIL]
        errors = [r for r in report.results if r.verdict == Verdict.ERROR]
        assert len(passed) == 1
        assert len(failed) == 1
        assert len(errors) == 1

    def test_multi_worker_run(self):
        runner = EvalRunner(workers=2, verbose=False)
        report = runner.run(self._make_suite())
        assert len(report.results) == 3

    def test_report_suite_name(self):
        runner = EvalRunner(workers=1, verbose=False)
        report = runner.run(self._make_suite())
        assert report.suite_name == "runner-test"


# ── Metrics ───────────────────────────────────────────────────────────────────

class TestMetrics:
    def _make_results(self):
        suite = EvalSuite(name="m")
        cases = [
            (EvalCase(id="1", description="p", category="cat-a", input={}, expected=1), lambda i, e: 1),
            (EvalCase(id="2", description="p", category="cat-a", input={}, expected=1), lambda i, e: 1),
            (EvalCase(id="3", description="f", category="cat-b", input={}, expected=1), lambda i, e: 0),
            (EvalCase(id="4", description="e", category="cat-b", input={}), lambda i, e: (_ for _ in ()).throw(RuntimeError("err"))),
        ]
        results = []
        for case, fn in cases:
            results.append(suite.run_case(case, fn))
        return results

    def test_totals(self):
        results = self._make_results()
        m = Metrics.from_results(results)
        assert m.total == 4
        assert m.passed == 2
        assert m.failed == 1
        assert m.errors == 1

    def test_pass_rate(self):
        results = self._make_results()
        m = Metrics.from_results(results)
        assert abs(m.pass_rate - 0.5) < 0.001

    def test_by_category(self):
        results = self._make_results()
        m = Metrics.from_results(results)
        assert "cat-a" in m.by_category
        assert m.by_category["cat-a"]["passed"] == 2
        assert m.by_category["cat-a"]["total"] == 2

    def test_empty_results(self):
        m = Metrics.from_results([])
        assert m.total == 0
        assert m.pass_rate == 0.0
        assert m.avg_latency_ms == 0.0


# ── EvalReport ────────────────────────────────────────────────────────────────

class TestEvalReport:
    def _make_report(self) -> EvalReport:
        suite = EvalSuite(name="report-suite")

        @suite.case(id="x-001", description="ok", category="unit", input={"v": 7}, expected=7)
        def fn(inp, exp):
            return inp["v"]

        runner = EvalRunner(workers=1, verbose=False)
        return runner.run(suite)

    def test_metrics_property(self):
        report = self._make_report()
        assert report.metrics.total == 1
        assert report.metrics.passed == 1

    def test_to_dict_structure(self):
        report = self._make_report()
        d = report.to_dict()
        assert d["suite"] == "report-suite"
        assert "metrics" in d
        assert "results" in d
        assert d["metrics"]["total"] == 1
        assert d["results"][0]["verdict"] == "pass"

    def test_print_summary_runs(self, capsys):
        report = self._make_report()
        report.print_summary()
        captured = capsys.readouterr()
        assert "report-suite" in captured.out
        assert "Pass" in captured.out or "✅" in captured.out

    def test_save_and_load(self):
        report = self._make_report()
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False, mode="w") as f:
            path = f.name
        try:
            report.save(path)
            data = json.loads(open(path).read())
            assert data["suite"] == "report-suite"
            assert data["metrics"]["passed"] == 1
        finally:
            os.unlink(path)
