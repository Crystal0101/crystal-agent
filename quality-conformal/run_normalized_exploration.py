"""Exploratory quality-normalised conformal comparison with equal score budget."""

import json
from pathlib import Path

import numpy as np

from quality_conformal import (
    QualityMondrianConformal,
    QualityNormalizedConformal,
    prediction_set_metrics,
)
from run_cached_dermacal import CORRUPTIONS, SEVERITIES, softmax


MODELS = ("resnet50", "efficientnet_b0", "dinov2_b", "vit_b_16")


def main():
    root = Path(__file__).resolve().parent
    qaca = root.parent / "dermacal/experiments/results/qaca"
    corrupted = root.parent / "dermacal/experiments/results/corrupted"
    rows = []
    for model in MODELS:
        val = qaca / "_val_cache"
        test_q = qaca / "_quality_cache"
        test_logits = corrupted / model
        labels_cal = np.load(val / f"lb_{model}.npy").astype(np.int64)
        labels_test = np.load(test_logits / "clean_labels.npy").astype(np.int64)
        temperature = float(np.load(qaca / model / "qaca_params.npy")[0])
        for corruption in CORRUPTIONS:
            for severity in SEVERITIES:
                suffix = f"{corruption}_s{severity}"
                p_cal = softmax(np.load(val / f"lg_{model}_{suffix}.npy"), temperature)
                q_cal = np.load(val / f"q_{suffix}.npy")
                p_test = softmax(np.load(test_logits / f"{suffix}_logits.npy"), temperature)
                q_test = np.load(test_q / f"{suffix}.npy")

                normalised = QualityNormalizedConformal(alpha=0.1, seed=2026).fit(
                    p_cal, labels_cal, q_cal)
                idx = normalised.split_indices_["conformal"]
                pooled_equal = QualityMondrianConformal(
                    alpha=0.1, n_quality_bins=1, min_bin_size=1).fit(
                        p_cal[idx], labels_cal[idx], q_cal[idx])

                # Test labels are used only after both prediction sets exist.
                sets = {
                    "pooled_equal_budget": pooled_equal.predict_sets(p_test, q_test),
                    "quality_normalized": normalised.predict_sets(p_test, q_test),
                }
                for method, prediction_sets in sets.items():
                    rows.append({
                        "model": model, "corruption": corruption,
                        "severity": severity, "method": method,
                        **prediction_set_metrics(prediction_sets, labels_test),
                    })

    summary = {}
    for method in ("pooled_equal_budget", "quality_normalized"):
        g = [r for r in rows if r["method"] == method]
        summary[method] = {
            "coverage": float(np.mean([r["coverage"] for r in g])),
            "average_set_size": float(np.mean([r["average_set_size"] for r in g])),
            "singleton_selective_risk": float(np.nanmean(
                [r["singleton_selective_risk"] for r in g])),
        }
    output = root / "results/normalized_exploration.json"
    output.write_text(json.dumps({
        "protocol": "exploratory-quality-normalized-v1",
        "warning": "Developed after observing Mondrian results; requires independent confirmation.",
        "summary": summary,
        "results": rows,
    }, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))
    print("saved", output)


if __name__ == "__main__":
    main()
