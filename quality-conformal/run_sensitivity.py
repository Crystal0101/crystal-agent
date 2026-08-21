"""Predefined sensitivity grid for matched-condition conformal experiments."""

import json
from pathlib import Path

import numpy as np

from run_cached_dermacal import run


MODELS = ("resnet50", "efficientnet_b0", "dinov2_b", "vit_b_16")
ALPHAS = (0.05, 0.10, 0.20)
BINS = (2, 3, 4, 5)
MIN_BIN_SIZES = (20, 50, 100)


def summarise(rows):
    out = {}
    for method in ("pooled", "quality_mondrian"):
        group = [r for r in rows if r["method"] == method]
        out[method] = {
            "coverage": float(np.mean([r["coverage"] for r in group])),
            "coverage_gap": float(np.mean([r["coverage_gap_from_target"] for r in group])),
            "average_set_size": float(np.mean([r["average_set_size"] for r in group])),
            "singleton_selective_risk": float(np.nanmean(
                [r["singleton_selective_risk"] for r in group])),
            "fallback_condition_fraction": float(np.mean(
                [bool(r["fallback_strata"]) for r in group])),
        }
    out["paired_delta_mondrian_minus_pooled"] = {
        metric: out["quality_mondrian"][metric] - out["pooled"][metric]
        for metric in ("coverage", "average_set_size", "singleton_selective_risk")
    }
    return out


def main():
    root = Path(__file__).resolve().parent
    qaca = root.parent / "dermacal/experiments/results/qaca"
    corrupted = root.parent / "dermacal/experiments/results/corrupted"
    records = []
    for alpha in ALPHAS:
        for bins in BINS:
            for min_size in MIN_BIN_SIZES:
                rows = []
                for model in MODELS:
                    rows.extend(run(model, qaca, corrupted, alpha, bins, min_size)["results"])
                records.append({
                    "alpha": alpha,
                    "bins": bins,
                    "min_bin_size": min_size,
                    "n_paired_conditions": len(rows) // 2,
                    "summary": summarise(rows),
                })
                print(alpha, bins, min_size,
                      records[-1]["summary"]["paired_delta_mondrian_minus_pooled"])
    output = root / "results/sensitivity.json"
    output.write_text(json.dumps({
        "protocol": "predefined-matched-sensitivity-v1",
        "models": MODELS,
        "alphas": ALPHAS,
        "bins": BINS,
        "min_bin_sizes": MIN_BIN_SIZES,
        "records": records,
    }, indent=2), encoding="utf-8")
    print("saved", output)


if __name__ == "__main__":
    main()
