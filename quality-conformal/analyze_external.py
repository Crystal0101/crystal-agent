"""Aggregate independent MedMNIST runs without hiding seed variability."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from scipy import stats


METRICS = ("coverage", "average_set_size", "singleton_fraction",
           "singleton_selective_risk", "point_error")
EXPECTED_DATASETS = ("bloodmnist", "dermamnist")
EXPECTED_SEEDS = tuple(range(2026, 2036))


def mean_ci(values, confidence=.95):
    x = np.asarray(values, dtype=float)
    x = x[np.isfinite(x)]
    if len(x) == 0:
        return {"mean": None, "ci_low": None, "ci_high": None, "n": 0}
    mean = float(x.mean())
    if len(x) < 2:
        return {"mean": mean, "ci_low": None, "ci_high": None, "n": len(x)}
    half = float(stats.t.ppf((1 + confidence) / 2, len(x) - 1)
                 * x.std(ddof=1) / np.sqrt(len(x)))
    return {"mean": mean, "ci_low": mean - half, "ci_high": mean + half,
            "n": len(x)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--results-dir", type=Path,
                        default=Path(__file__).parent / "results")
    args = parser.parse_args()
    files = sorted(args.results_dir.glob("external_*_seed*.json"))
    payloads = [json.loads(f.read_text()) for f in files]
    identities = [(p.get("dataset"), p.get("seed")) for p in payloads]
    expected = {(dataset, seed) for dataset in EXPECTED_DATASETS
                for seed in EXPECTED_SEEDS}
    if len(identities) != len(set(identities)):
        raise ValueError("duplicate dataset/seed identity")
    missing, extra = expected - set(identities), set(identities) - expected
    if missing or extra:
        raise ValueError(f"matrix mismatch; missing={sorted(missing)}, extra={sorted(extra)}")
    output = {
        "analysis_unit": "independent_training_and_corruption_seed",
        "coverage_interval": "two_sided_95_percent_t_interval_over_seed_level_coverages",
        "warning": (
            "The same official test images recur across seeds; pooled image counts "
            "are not independent Bernoulli trials and are intentionally not reported."
        ),
        "datasets": {},
    }
    for dataset in EXPECTED_DATASETS:
        runs = [p for p in payloads if p["dataset"] == dataset]
        if sorted(p["seed"] for p in runs) != list(EXPECTED_SEEDS):
            raise ValueError(f"seed mismatch: {dataset}")
        entry = {"seeds": [p["seed"] for p in runs],
                 "clean_test_accuracy": mean_ci([p["clean_test_accuracy"] for p in runs]),
                 "mixed_test_point_accuracy": mean_ci([p["mixed_test_point_accuracy"] for p in runs]),
                 "methods": {}, "paired_bin3_minus_pooled": {}}
        method_keys = sorted({(r.get("method", "lac"), r["bins"])
                              for r in runs[0]["results"]})
        for score_name, bins in method_keys:
            method = {}
            for metric in METRICS:
                method[metric] = mean_ci([
                    next(x for x in p["results"] if x["bins"] == bins
                         and x.get("method", "lac") == score_name)[metric]
                    for p in runs])
            example = next(x for x in runs[0]["results"] if x["bins"] == bins
                           and x.get("method", "lac") == score_name)
            qualities = sorted(example["by_quality"])
            method["by_quality"] = {
                q: {metric: mean_ci([
                    next(x for x in p["results"] if x["bins"] == bins
                         and x.get("method", "lac") == score_name)
                    ["by_quality"][q][metric] for p in runs])
                    for metric in METRICS}
                for q in qualities
            }
            entry["methods"][f"{score_name}_bins{bins}"] = method
        for score_name in sorted({x[0] for x in method_keys}):
            available_bins = {x[1] for x in method_keys if x[0] == score_name}
            if not {1, 3}.issubset(available_bins):
                continue
            entry["paired_bin3_minus_pooled"][score_name] = {}
            for metric in METRICS:
                diffs = []
                for p in runs:
                    result = {x["bins"]: x for x in p["results"]
                              if x.get("method", "lac") == score_name}
                    diffs.append(result[3][metric] - result[1][metric])
                entry["paired_bin3_minus_pooled"][score_name][metric] = mean_ci(diffs)
        output["datasets"][dataset] = entry
    target = args.results_dir / "external_aggregate.json"
    target.write_text(json.dumps(output, indent=2, allow_nan=False), encoding="utf-8")
    print(json.dumps(output, indent=2, allow_nan=False))
    print("saved", target)


if __name__ == "__main__":
    main()
