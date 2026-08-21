"""Run matched-condition conformal baselines on frozen DermaCal logits.

Validation logits/labels/quality are calibration data. Test labels are loaded
only after prediction sets have been produced. Each corruption/severity is fit
and evaluated separately, so the nominal split-conformal statement is confined
to that pre-specified condition; cross-condition stress tests are separate work.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np

from quality_conformal import QualityMondrianConformal, prediction_set_metrics


CORRUPTIONS = (
    "gaussian_blur", "motion_blur", "gaussian_noise",
    "brightness_shift", "color_shift", "jpeg_compression",
)
SEVERITIES = (1, 2, 3)


def softmax(logits: np.ndarray, temperature: float) -> np.ndarray:
    z = logits.astype(np.float64) / float(temperature)
    z -= z.max(axis=1, keepdims=True)
    exp = np.exp(z)
    return exp / exp.sum(axis=1, keepdims=True)


def run(model: str, qaca_dir: Path, corrupted_dir: Path, alpha: float,
        bins: int, min_bin_size: int) -> dict:
    val = qaca_dir / "_val_cache"
    test_q = qaca_dir / "_quality_cache"
    test_logits = corrupted_dir / model
    y_cal = np.load(val / f"lb_{model}.npy").astype(np.int64)
    y_test_path = test_logits / "clean_labels.npy"
    temperature = float(np.load(qaca_dir / model / "qaca_params.npy")[0])

    rows = []
    for corruption in CORRUPTIONS:
        for severity in SEVERITIES:
            suffix = f"{corruption}_s{severity}"
            cal_probs = softmax(np.load(val / f"lg_{model}_{suffix}.npy"), temperature)
            cal_quality = np.load(val / f"q_{suffix}.npy")
            eval_probs = softmax(np.load(test_logits / f"{suffix}_logits.npy"), temperature)
            eval_quality = np.load(test_q / f"{suffix}.npy")

            pooled = QualityMondrianConformal(
                alpha=alpha, n_quality_bins=1, min_bin_size=min_bin_size
            ).fit(cal_probs, y_cal, cal_quality)
            mondrian = QualityMondrianConformal(
                alpha=alpha, n_quality_bins=bins, min_bin_size=min_bin_size
            ).fit(cal_probs, y_cal, cal_quality)

            # No test labels have been loaded before both methods predict.
            pooled_sets = pooled.predict_sets(eval_probs, eval_quality)
            mondrian_sets = mondrian.predict_sets(eval_probs, eval_quality)
            y_test = np.load(y_test_path).astype(np.int64)

            for name, sets, fitted in (
                ("pooled", pooled_sets, pooled),
                ("quality_mondrian", mondrian_sets, mondrian),
            ):
                metrics = prediction_set_metrics(
                    sets, y_test, point_predictions=eval_probs.argmax(axis=1))
                metrics["coverage_gap_from_target"] = metrics["coverage"] - (1.0 - alpha)
                rows.append({
                    "model": model,
                    "corruption": corruption,
                    "severity": severity,
                    "method": name,
                    "n_calibration": int(len(y_cal)),
                    "n_test": int(len(y_test)),
                    "target_coverage": 1.0 - alpha,
                    "quality_edges": list(fitted.summary_.quality_edges),
                    "fallback_strata": list(fitted.summary_.fallback_strata),
                    **metrics,
                })

    return {
        "protocol": "matched-condition-split-conformal-v1",
        "model": model,
        "temperature_source": "DermaCal validation-fitted T_base",
        "alpha": alpha,
        "n_quality_bins": bins,
        "min_bin_size": min_bin_size,
        "claim_boundary": (
            "Coverage is assessed within pre-specified matched corruption conditions. "
            "No guarantee is claimed for unseen corruptions or natural external domains."
        ),
        "results": rows,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="resnet50")
    parser.add_argument("--qaca-dir", type=Path,
                        default=Path("../dermacal/experiments/results/qaca"))
    parser.add_argument("--corrupted-dir", type=Path,
                        default=Path("../dermacal/experiments/results/corrupted"))
    parser.add_argument("--alpha", type=float, default=0.10)
    parser.add_argument("--bins", type=int, default=3)
    parser.add_argument("--min-bin-size", type=int, default=50)
    parser.add_argument("--output", type=Path,
                        default=Path("results/matched_resnet50.json"))
    args = parser.parse_args()
    result = run(args.model, args.qaca_dir, args.corrupted_dir,
                 args.alpha, args.bins, args.min_bin_size)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(f"saved {args.output}")


if __name__ == "__main__":
    main()
