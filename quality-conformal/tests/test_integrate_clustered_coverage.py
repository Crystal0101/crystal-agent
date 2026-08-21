from __future__ import annotations

import csv
import json
import tempfile
import unittest
from contextlib import ExitStack
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import analyze_natural_domain as analysis
import integrate_clustered_coverage as integration
from integrate_clustered_coverage import (
    build_results_block,
    build_status_block,
    replace_block,
)


def metric(value: float) -> dict:
    return {
        "estimate": value,
        "cluster_bootstrap_95ci": [max(0, value - .01), min(1, value + .01)],
        "one_image_per_group_sensitivity": {"coverage": value - .02},
    }


class IntegrateClusteredCoverageTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name) / "QualityConformal"
        self.audit_dir = self.root / "results/natural_domain_v1/cluster_audit_v1"
        self.analysis_dir = self.root / "results/natural_domain_v1/analysis_v1"
        self.audit_dir.mkdir(parents=True)
        self.analysis_dir.mkdir(parents=True)
        self.paper = self.root / "PAPER_DRAFT_CN_v0.2.md"
        self.paper.write_text(
            "head\n<!-- BEGIN AUTO QUALITY CLUSTER STATUS -->\nold-status\n"
            "<!-- END AUTO QUALITY CLUSTER STATUS -->\n"
            "<!-- BEGIN AUTO QUALITY CLUSTER RESULTS -->\nold-results\n"
            "<!-- END AUTO QUALITY CLUSTER RESULTS -->\ntail\n",
            encoding="utf-8",
        )
        self.manifest = self.audit_dir / "integration_manifest.json"
        for model in analysis.MODELS:
            (self.audit_dir / f"{model}_clustered_coverage.json").write_text(
                json.dumps({"model": model}), encoding="utf-8"
            )
        for name in integration.OUTPUT_NAMES:
            (self.analysis_dir / name).write_bytes(f"old-{name}".encode())
        self.manifest.write_bytes(b"old-manifest")
        self.plotter_path = self.root / "plot_natural_domain.py"
        self.plotter_path.write_text("# test plotter\n", encoding="utf-8")
        self.valid_audits = self.audits()
        self.payloads = [{"model": model} for model in analysis.MODELS]
        self.plotter = SimpleNamespace(
            __file__=str(self.plotter_path), main=self.fake_plot
        )
        self.targets = tuple(
            [*(self.analysis_dir / name for name in integration.OUTPUT_NAMES),
             self.paper, self.manifest]
        )
        self.originals = {path: path.read_bytes() for path in self.targets}

    def tearDown(self):
        self.temporary.cleanup()

    def audits(self):
        audits = {}
        for offset, model in enumerate(analysis.MODELS):
            domains = {}
            for domain in analysis.DOMAINS:
                methods = {}
                for method_name, value in (("pooled_lac", .8 + offset * .01),
                                           ("quality_lac", .81 + offset * .01)):
                    methods[method_name] = {
                        "coverage": metric(value),
                        "average_set_size": {"estimate": 1.5 + offset * .1},
                    }
                domains[domain] = {"methods": methods}
            audits[model] = {"domains": domains}
        return audits

    def fake_analyse(self, _payloads, _audits, *, output_dir):
        output_dir.mkdir(parents=True, exist_ok=True)
        with (output_dir / "run_level_metrics.csv").open(
                "w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=("model", "domain", "method"))
            writer.writeheader()
            for model in analysis.MODELS:
                for domain in analysis.DOMAINS:
                    for method in analysis.METHODS:
                        writer.writerow({"model": model, "domain": domain, "method": method})
        (output_dir / "RESULTS_SUMMARY_CN.md").write_text(
            "# QualityConformal自然域结果摘要\nfixture\n", encoding="utf-8"
        )

    @staticmethod
    def fake_plot(*, input_path, output_dir):
        if not input_path.is_file():
            raise FileNotFoundError(input_path)
        (output_dir / "natural_domain_coverage_size.png").write_bytes(
            b"\x89PNG\r\n\x1a\nfixture"
        )
        (output_dir / "natural_domain_coverage_size.pdf").write_bytes(
            b"%PDF-1.7\nfixture"
        )

    def patches(self):
        stack = ExitStack()
        stack.enter_context(patch.object(integration, "HERE", self.root))
        stack.enter_context(patch.object(integration, "PAPER", self.paper))
        stack.enter_context(patch.object(integration, "AUDIT_DIR", self.audit_dir))
        stack.enter_context(patch.object(integration, "ANALYSIS_DIR", self.analysis_dir))
        stack.enter_context(patch.object(integration, "MANIFEST", self.manifest))
        stack.enter_context(patch.object(analysis, "load",
                                         return_value=(self.payloads, self.valid_audits)))
        stack.enter_context(patch.object(analysis, "analyse",
                                         side_effect=self.fake_analyse))
        return stack

    def assert_formal_targets_unchanged(self):
        self.assertEqual(
            {path: path.read_bytes() for path in self.targets}, self.originals
        )
        self.assertEqual(list(self.audit_dir.glob(".cluster-integration-*")), [])

    def test_replaces_only_unique_marker_pair(self):
        source = "a\n<!-- BEGIN AUTO X -->\nold\n<!-- END AUTO X -->\nz\n"
        self.assertEqual(
            replace_block(source, "X", "new"),
            "a\n<!-- BEGIN AUTO X -->\nnew\n<!-- END AUTO X -->\nz\n",
        )
        with self.assertRaises(ValueError):
            replace_block("no markers", "X", "new")

    def test_result_block_contains_all_models_and_cluster_label(self):
        block = build_results_block(self.audits())
        for label in ("ResNet-50", "EfficientNet-B0", "ViT-B/16"):
            self.assertIn(label, block)
        self.assertIn("group-bootstrap", block)
        self.assertIn("10,000", block)
        self.assertIn("描述性压力测试", block)
        self.assertIn("不恢复", block)

    def test_status_preserves_evidence_boundary_and_open_review(self):
        status = build_status_block()
        self.assertIn("不恢复", status)
        self.assertIn("描述性压力测试", status)
        self.assertIn("仍需用户人工终审", status)
        self.assertNotIn("仅余用户", status)

    def test_transaction_stages_everything_and_publishes_manifest_last(self):
        real_replace = integration.os.replace
        published = []

        def recording_replace(source, destination):
            destination = Path(destination)
            if destination in self.targets:
                published.append(destination)
            real_replace(source, destination)

        with self.patches(), patch.object(
                integration.os, "replace", side_effect=recording_replace):
            manifest = integration._integrate_locked(self.plotter)
        self.assertEqual(published[-1], self.manifest)
        self.assertEqual(
            manifest["transaction_policy"],
            "same_filesystem_stage_validate_rollback_manifest_last_under_exclusive_lock",
        )
        committed = json.loads(self.manifest.read_text(encoding="utf-8"))
        self.assertEqual(committed, manifest)
        self.assertEqual(
            committed["manuscript_sha256"], integration.sha256_file(self.paper)
        )
        self.assertEqual(list(self.audit_dir.glob(".cluster-integration-*")), [])

    def test_analysis_failure_leaves_every_formal_byte_unchanged(self):
        with self.patches(), patch.object(
                analysis, "analyse", side_effect=RuntimeError("analysis failure")):
            with self.assertRaisesRegex(RuntimeError, "analysis failure"):
                integration._integrate_locked(self.plotter)
        self.assert_formal_targets_unchanged()

    def test_plot_failure_leaves_every_formal_byte_unchanged(self):
        failing_plotter = SimpleNamespace(
            __file__=str(self.plotter_path),
            main=lambda **_kwargs: (_ for _ in ()).throw(RuntimeError("plot failure")),
        )
        with self.patches():
            with self.assertRaisesRegex(RuntimeError, "plot failure"):
                integration._integrate_locked(failing_plotter)
        self.assert_formal_targets_unchanged()

    def test_pre_manifest_validation_failure_leaves_formal_outputs_unchanged(self):
        with self.patches(), patch.object(
                integration, "_build_manifest",
                side_effect=RuntimeError("pre-manifest failure")):
            with self.assertRaisesRegex(RuntimeError, "pre-manifest failure"):
                integration._integrate_locked(self.plotter)
        self.assert_formal_targets_unchanged()

    def test_duplicate_staged_matrix_is_rejected_without_publication(self):
        def duplicate_analyse(_payloads, _audits, *, output_dir):
            output_dir.mkdir(parents=True, exist_ok=True)
            with (output_dir / "run_level_metrics.csv").open(
                    "w", encoding="utf-8", newline="") as handle:
                writer = csv.DictWriter(
                    handle, fieldnames=("model", "domain", "method")
                )
                writer.writeheader()
                duplicate = {
                    "model": analysis.MODELS[0], "domain": analysis.DOMAINS[0],
                    "method": analysis.METHODS[0],
                }
                for _ in range(
                        len(analysis.MODELS) * len(analysis.DOMAINS)
                        * len(analysis.METHODS)):
                    writer.writerow(duplicate)
            (output_dir / "RESULTS_SUMMARY_CN.md").write_text(
                "# QualityConformal自然域结果摘要\nfixture\n", encoding="utf-8"
            )

        with self.patches(), patch.object(
                analysis, "analyse", side_effect=duplicate_analyse):
            with self.assertRaisesRegex(ValueError, "exact result matrix"):
                integration._integrate_locked(self.plotter)
        self.assert_formal_targets_unchanged()

    def assert_publication_failure_rolls_back(self, failed_target: Path):
        real_replace = integration.os.replace

        def injected_replace(source, destination):
            if Path(destination) == failed_target:
                raise OSError(f"synthetic publication failure: {failed_target.name}")
            real_replace(source, destination)

        with self.patches(), patch.object(
                integration.os, "replace", side_effect=injected_replace):
            with self.assertRaisesRegex(OSError, "synthetic publication failure"):
                integration._integrate_locked(self.plotter)
        self.assert_formal_targets_unchanged()

    def test_mid_output_publication_failure_rolls_back(self):
        self.assert_publication_failure_rolls_back(self.targets[1])

    def test_manuscript_replace_failure_rolls_back_outputs(self):
        self.assert_publication_failure_rolls_back(self.paper)

    def test_manifest_last_publication_failure_rolls_back_everything(self):
        self.assert_publication_failure_rolls_back(self.manifest)


if __name__ == "__main__":
    unittest.main()
