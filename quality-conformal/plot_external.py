"""Create manuscript figures from the frozen aggregate JSON."""

import json
from pathlib import Path

import matplotlib.pyplot as plt


ROOT = Path(__file__).parent
DATA = json.loads((ROOT / "results" / "external_aggregate.json").read_text())
OUT = ROOT / "figures"
OUT.mkdir(exist_ok=True)

labels = {
    "lac_bins1": "Pooled LAC",
    "lac_bins3": "Quality LAC",
    "lac_confidence_control_bins3": "Confidence control",
    "lac_class_conditional_control_bins3": "Class conditional",
}
colors = ["#4C78A8", "#E45756", "#72B7B2", "#F2CF5B"]

fig, axes = plt.subplots(1, 2, figsize=(10, 4.2), constrained_layout=True)
for ax, (dataset, entry) in zip(axes, DATA["datasets"].items()):
    for color, (key, label) in zip(colors, labels.items()):
        method = entry["methods"][key]
        x, y = method["average_set_size"], method["coverage"]
        ax.errorbar(x["mean"], y["mean"],
                    xerr=[[x["mean"]-x["ci_low"]], [x["ci_high"]-x["mean"]]],
                    yerr=[[y["mean"]-y["ci_low"]], [y["ci_high"]-y["mean"]]],
                    fmt="o", capsize=3, color=color, label=label)
    ax.axhline(.9, ls="--", lw=1, color="black")
    ax.set(title=dataset, xlabel="Average prediction-set size",
           ylabel="Marginal coverage")
axes[1].legend(frameon=False, fontsize=8)
for suffix in ("png", "pdf"):
    fig.savefig(OUT / f"coverage_efficiency.{suffix}", dpi=300)
plt.close(fig)

fig, axes = plt.subplots(1, 2, figsize=(10, 4.2), constrained_layout=True,
                         sharey=True)
for ax, (dataset, entry) in zip(axes, DATA["datasets"].items()):
    strata = entry["methods"]["lac_bins3"]["by_quality"]
    xs, ys, lo, hi = [], [], [], []
    for key, item in strata.items():
        quality = float(key.split("_")[1])
        exact = item["pooled_exact_coverage"]
        estimate = exact["successes"] / exact["trials"]
        xs.append(quality); ys.append(estimate)
        lo.append(estimate-exact["ci_low"]); hi.append(exact["ci_high"]-estimate)
    ax.errorbar(xs, ys, yerr=[lo, hi], marker="o", capsize=3, color="#E45756")
    ax.axhline(.9, ls="--", lw=1, color="black")
    ax.set(title=dataset, xlabel="Oracle quality (higher is better)",
           ylabel="Coverage pooled over five seeds", ylim=(.82, 1.01))
for suffix in ("png", "pdf"):
    fig.savefig(OUT / f"quality_stratum_coverage.{suffix}", dpi=300)
plt.close(fig)
