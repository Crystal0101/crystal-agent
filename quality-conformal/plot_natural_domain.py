"""Generate the frozen natural-domain coverage/efficiency figure."""

from __future__ import annotations

import csv
import os
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np


HERE = Path(__file__).resolve().parent
INPUT = HERE / "results/natural_domain_v1/analysis_v1/run_level_metrics.csv"
OUTPUT = HERE / "results/natural_domain_v1/analysis_v1"
MODELS = ["resnet50", "efficientnet_b0", "vit_b_16"]
LABELS = ["ResNet-50", "EfficientNet-B0", "ViT-B/16"]
METHODS = ["pooled_lac", "quality_lac", "pooled_aps", "quality_aps"]
METHOD_LABELS = ["Pooled LAC", "Quality LAC", "Pooled APS", "Quality APS"]
COLORS = ["#355C7D", "#6C5B7B", "#2A9D8F", "#E9C46A"]


def load(input_path: Path | None = None) -> dict[tuple[str, str, str], dict[str, float]]:
    source = INPUT if input_path is None else Path(input_path)
    rows: dict[tuple[str, str, str], dict[str, float]] = {}
    with source.open(newline="") as handle:
        for row in csv.DictReader(handle):
            rows[(row["model"], row["domain"], row["method"])] = {
                "coverage": float(row["coverage"]),
                "set_size": float(row["average_set_size"]),
            }
    return rows


def main(*, input_path: Path | None = None,
         output_dir: Path | None = None) -> None:
    target_dir = OUTPUT if output_dir is None else Path(output_dir)
    rows = load(input_path)
    target_dir.mkdir(parents=True, exist_ok=True)
    fig, axes = plt.subplots(2, 2, figsize=(11.5, 7.4), constrained_layout=True)
    x = np.arange(len(MODELS))
    width = 0.19
    for column, domain in enumerate(("test", "external")):
        for metric, row_index in (("coverage", 0), ("set_size", 1)):
            axis = axes[row_index, column]
            for method_index, method in enumerate(METHODS):
                values = [rows[(model, domain, method)][metric] for model in MODELS]
                offset = (method_index - 1.5) * width
                axis.bar(x + offset, values, width, color=COLORS[method_index],
                         label=METHOD_LABELS[method_index])
            axis.set_xticks(x, LABELS)
            axis.grid(axis="y", alpha=0.25)
            if metric == "coverage":
                axis.axhline(0.9, color="#C1121F", linestyle="--", linewidth=1.2,
                             label="Target 0.90" if column == 0 else None)
                axis.set_ylim(0, 1.03)
                axis.set_ylabel("Coverage")
            else:
                axis.set_ylabel("Average set size")
        axes[0, column].set_title("HAM10000 internal test" if domain == "test"
                                  else "PAD-UFES-20 external test")
    handles, labels = axes[0, 0].get_legend_handles_labels()
    fig.legend(handles, labels, loc="outside lower center", ncol=5, frameon=False)
    fig.suptitle("Natural-domain coverage and prediction-set size", fontsize=14)
    for suffix in ("png", "pdf"):
        target = target_dir / f"natural_domain_coverage_size.{suffix}"
        temporary = target.with_name(f".{target.name}.{os.getpid()}.tmp")
        try:
            fig.savefig(temporary, dpi=300, format=suffix)
            with temporary.open("r+b") as handle:
                os.fsync(handle.fileno())
            os.replace(temporary, target)
        finally:
            if temporary.exists():
                temporary.unlink()
    plt.close(fig)


if __name__ == "__main__":
    main()
