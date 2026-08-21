from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


HERE = Path(__file__).resolve().parents[1]


class AnalyzeExternalTests(unittest.TestCase):
    def test_seed_is_the_only_inferential_unit(self):
        with tempfile.TemporaryDirectory() as tmp:
            result_dir = Path(tmp) / "results"
            result_dir.mkdir()
            for source in sorted((HERE / "results").glob("external_*_seed*.json")):
                (result_dir / source.name).write_bytes(source.read_bytes())
            completed = subprocess.run(
                [sys.executable, str(HERE / "analyze_external.py"),
                 "--results-dir", str(result_dir)],
                check=False, capture_output=True, text=True,
            )
            self.assertEqual(completed.returncode, 0, completed.stderr)
            payload = json.loads(
                (result_dir / "external_aggregate.json").read_text(encoding="utf-8")
            )
            self.assertEqual(payload["analysis_unit"],
                             "independent_training_and_corruption_seed")
            self.assertIn("not independent", payload["warning"])
            self.assertEqual(set(payload["datasets"]), {"bloodmnist", "dermamnist"})
            for dataset in payload["datasets"].values():
                self.assertEqual(len(dataset["seeds"]), 10)
                for method in dataset["methods"].values():
                    for stratum in method["by_quality"].values():
                        self.assertNotIn("pooled_exact_coverage", stratum)
                        self.assertEqual(stratum["coverage"]["n"], 10)


if __name__ == "__main__":
    unittest.main()
