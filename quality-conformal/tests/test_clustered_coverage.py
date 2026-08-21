from __future__ import annotations

import hashlib
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import numpy as np

import analyze_natural_domain as analyzer
import reanalyse_clustered_coverage as clustered
from reanalyse_clustered_coverage import (
    cluster_bootstrap_interval,
    existing_audit_is_current,
    grouped_values,
    load_frozen_raw_quality,
    one_image_per_group,
    stable_seed,
)


class ClusteredCoverageTests(unittest.TestCase):
    def test_group_aggregation_retains_all_images(self):
        sums, counts = grouped_values(
            np.array([1, 0, 1, 1], float), ["p1", "p1", "p2", "p3"]
        )
        np.testing.assert_array_equal(sums, [1, 1, 1])
        np.testing.assert_array_equal(counts, [2, 1, 1])

    def test_audit_json_write_is_atomic_and_strict_json(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "audit.json"
            clustered.atomic_write(target, {"complete": True})
            self.assertEqual(target.read_text(encoding="utf-8"),
                             '{\n  "complete": true\n}\n')
            self.assertEqual(list(target.parent.glob(f".{target.name}.*.tmp")), [])
            with self.assertRaises(ValueError):
                clustered.atomic_write(target, {"bad": float("nan")})

    def test_bootstrap_is_deterministic_and_bounded(self):
        values = np.array([1, 0, 1, 1, 0, 0], float)
        groups = ["a", "a", "b", "c", "c", "d"]
        kwargs = {"replicates": 500, "seed": stable_seed("test")}
        first = cluster_bootstrap_interval(values, groups, **kwargs)
        second = cluster_bootstrap_interval(values, groups, **kwargs)
        self.assertEqual(first, second)
        self.assertTrue(0 <= first[0] <= first[1] <= 1)

    def test_progress_interval_must_be_positive(self):
        with self.assertRaises(ValueError):
            clustered.aligned_collect(
                None, [], None, 1, "cpu", model_name="resnet50", role="test",
                progress_every_batches=0,
            )

    def test_formal_audit_rejects_nonprotocol_replicate_count_before_io(self):
        with self.assertRaises(ValueError):
            clustered._audit_model_unlocked(
                "resnet50", ham_root=Path("missing"), pad_root=Path("missing"),
                device="cpu", batch_size=1, replicates=999,
                progress_every_batches=1,
            )

    def test_formal_audit_rejects_backend_drift_before_expensive_inference(self):
        formal = {
            "protocol": "qualityconformal-natural-domain-v1-five-class",
            "model": "resnet50", "seed": 2026, "smoke": False,
            "classes": list(clustered.CANONICAL_CLASSES), "device": "mps",
        }
        with patch.object(clustered, "read_json_snapshot", return_value=(formal, "sha")):
            with self.assertRaisesRegex(ValueError, "reconstruction device mismatch"):
                clustered._audit_model_unlocked(
                    "resnet50", ham_root=Path("missing"), pad_root=Path("missing"),
                    device="cpu", batch_size=32, replicates=10_000,
                    progress_every_batches=10,
                )

    def test_one_image_sensitivity_uses_fixed_lexical_rule(self):
        result = one_image_per_group(
            np.array([0, 1, 1, 0], float),
            ["p1", "p1", "p2", "p3"],
            ["z", "a", "m", "n"],
        )
        self.assertEqual(result["n_groups"], 3)
        self.assertEqual(result["covered_groups"], 2)
        self.assertAlmostEqual(result["coverage"], 2 / 3)
        self.assertEqual(result["selection_rule"],
                         "lexicographically_first_image_id_within_group")

    def test_one_image_sensitivity_rejects_nonbinary_values(self):
        with self.assertRaises(ValueError):
            one_image_per_group(np.array([.5]), ["p1"], ["a"])

    def test_frozen_quality_cache_is_bound_to_record_order(self):
        records = [SimpleNamespace(image_id="a"), SimpleNamespace(image_id="b")]
        identity = hashlib.sha256(b"a\nb").hexdigest()
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            path = root / "brisque_test_224_full.npz"
            np.savez_compressed(
                path, values=np.array([1.0, 2.0], np.float32),
                record_sha256=identity,
            )
            values, digest, returned = load_frozen_raw_quality(
                records, "test", cache_dir=root
            )
            np.testing.assert_array_equal(values, [1.0, 2.0])
            self.assertEqual(digest, clustered.sha256_file(path))
            self.assertEqual(returned, path)
            with self.assertRaises(ValueError):
                load_frozen_raw_quality(list(reversed(records)), "test", cache_dir=root)

    def test_resume_skip_requires_strict_validator_success(self):
        model = "resnet50"
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / f"{model}_clustered_coverage.json").write_text("{}")
            valid = ([{"model": model}], {model: {"version": clustered.VERSION}})
            with (patch.object(clustered, "OUTPUT", root),
                  patch.object(analyzer, "load", return_value=valid)):
                self.assertTrue(existing_audit_is_current(model, replicates=10_000))
            with (patch.object(clustered, "OUTPUT", root),
                  patch.object(analyzer, "load", side_effect=ValueError("stale"))):
                self.assertFalse(existing_audit_is_current(model, replicates=10_000))
            with patch.object(clustered, "OUTPUT", root):
                self.assertFalse(existing_audit_is_current(model, replicates=999))


if __name__ == "__main__":
    unittest.main()
