from __future__ import annotations

import copy
import io
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch

import analyze_natural_domain as analysis


def sensitivity(n_groups: int = 4) -> dict:
    return {
        "selection_rule": analysis.ONE_IMAGE_RULE,
        "n_groups": n_groups,
        "covered_groups": 3,
        "coverage": 0.75,
        "group_level_exact_95ci": [0.2, 0.99],
    }


def metric(name: str = "coverage", n_images: int = 6,
           n_groups: int = 4) -> dict:
    if name == "coverage":
        estimate, interval, selected = .75, [.5, 1.0], sensitivity(n_groups)
    else:
        estimate, interval, selected = 1.5, [1.1, 1.9], None
    return {
        "n_images": n_images,
        "n_groups": n_groups,
        "estimate": estimate,
        "cluster_bootstrap_95ci": interval,
        "bootstrap_replicates": 10_000,
        "one_image_per_group_sensitivity": selected,
    }


class ClusterAuditValidationTests(unittest.TestCase):
    def test_validate_only_never_changes_formal_files(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            files = {
                root / "run_level_metrics.csv": b"old-csv",
                root / "RESULTS_SUMMARY_CN.md": b"old-summary",
                root / "integration_manifest.json": b"old-manifest",
                root / "PAPER_DRAFT_CN_v0.2.md": b"old-paper",
            }
            for path, content in files.items():
                path.write_bytes(content)
            before = {path: path.read_bytes() for path in files}
            with (patch.object(analysis, "OUTPUT", root),
                  patch.object(analysis, "load", return_value=([{}] * 3, {})),
                  patch.object(
                      analysis, "analyse",
                      side_effect=AssertionError("validate-only attempted publication"),
                  ), redirect_stdout(io.StringIO())):
                self.assertEqual(analysis.main(["--validate-only"]), 0)
            self.assertEqual({path: path.read_bytes() for path in files}, before)

    def test_atomic_text_write_replaces_complete_file_without_temp_residue(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "result.txt"
            target.write_text("old", encoding="utf-8")
            analysis.atomic_write_text(target, "new\n")
            self.assertEqual(target.read_text(encoding="utf-8"), "new\n")
            self.assertEqual(list(target.parent.glob(f".{target.name}.*.tmp")), [])

    def test_accepts_complete_coverage_and_set_size_metrics(self):
        analysis.validate_cluster_metric(
            metric(), metric_name="coverage", n_images=6, n_groups=4,
            context="coverage",
        )
        analysis.validate_cluster_metric(
            metric("average_set_size"), metric_name="average_set_size",
            n_images=6, n_groups=4, context="set_size",
        )

    def test_rejects_coverage_interval_above_one_or_nonfinite(self):
        invalid = metric()
        invalid["cluster_bootstrap_95ci"] = [.5, 1.01]
        with self.assertRaises(ValueError):
            analysis.validate_cluster_metric(
                invalid, metric_name="coverage", n_images=6, n_groups=4,
                context="coverage",
            )
        invalid = metric()
        invalid["estimate"] = float("nan")
        with self.assertRaises(ValueError):
            analysis.validate_cluster_metric(
                invalid, metric_name="coverage", n_images=6, n_groups=4,
                context="coverage",
            )

    def test_rejects_group_and_sensitivity_count_mismatch(self):
        invalid = metric()
        invalid["n_groups"] = 3
        with self.assertRaises(ValueError):
            analysis.validate_cluster_metric(
                invalid, metric_name="coverage", n_images=6, n_groups=4,
                context="coverage",
            )
        invalid = metric()
        invalid["one_image_per_group_sensitivity"]["covered_groups"] = 2
        with self.assertRaises(ValueError):
            analysis.validate_cluster_metric(
                invalid, metric_name="coverage", n_images=6, n_groups=4,
                context="coverage",
            )

    def test_bootstrap_scheme_must_be_exact(self):
        valid = {
            "scheme": analysis.BOOTSTRAP_SCHEME,
            "estimand": analysis.BOOTSTRAP_ESTIMAND,
            "replicates": 10_000,
            "confidence": .95,
            "seed_scheme": analysis.BOOTSTRAP_SEED_SCHEME,
        }
        analysis.validate_bootstrap_metadata(valid, "bootstrap")
        invalid = copy.deepcopy(valid)
        invalid["scheme"] = "image_bootstrap"
        with self.assertRaises(ValueError):
            analysis.validate_bootstrap_metadata(invalid, "bootstrap")

    def test_internal_rows_do_not_inherit_external_clip_fields(self):
        overall = {
            name: value for name, value in (
                ("n", 2), ("coverage", .5), ("average_set_size", 1.5),
                ("singleton_fraction", .5), ("empty_fraction", 0),
                ("singleton_selective_risk", .5), ("point_error", .5),
            )
        }
        overall["coverage_exact_95ci"] = [.1, .9]
        item = {
            "model": "resnet50", "seed": 2026,
            "external_quality_clipping": {"low": .3, "high": .02},
            "evaluations": {
                domain: [{"method": "pooled_lac", "overall": overall}]
                for domain in analysis.DOMAINS
            },
        }
        cluster_metric = metric(n_images=2, n_groups=2)
        cluster_metric["one_image_per_group_sensitivity"] = {
            "coverage": .5, "group_level_exact_95ci": [.1, .9]
        }
        cluster = {
            "coverage": cluster_metric,
            "average_set_size": metric("average_set_size", n_images=2, n_groups=2),
        }
        audits = {
            "resnet50": {
                "domains": {
                    domain: {"methods": {"pooled_lac": cluster}}
                    for domain in analysis.DOMAINS
                }
            }
        }
        rows = analysis.build_rows([item], audits)
        internal = next(row for row in rows if row["domain"] == "test")
        external = next(row for row in rows if row["domain"] == "external")
        self.assertIsNone(internal["quality_clip_low"])
        self.assertIsNone(internal["quality_clip_high"])
        self.assertEqual(external["quality_clip_low"], .3)
        self.assertEqual(external["quality_clip_high"], .02)


if __name__ == "__main__":
    unittest.main()
