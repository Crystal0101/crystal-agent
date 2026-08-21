#!/usr/bin/env python3
"""Reconstruct BloodMNIST singleton counts from frozen ten-seed JSON metrics."""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import statistics
from pathlib import Path

from scipy.stats import t as student_t

HERE = Path(__file__).resolve().parent
SEEDS = tuple(range(2026, 2036))
METHOD = "lac"
CONDITIONS = ((1, "pooled_lac"), (3, "quality_lac_3bins"))


def exact_count(value: float, label: str, tolerance: float = 1e-7) -> int:
    nearest = round(value)
    if not math.isfinite(value) or abs(value - nearest) > tolerance:
        raise ValueError(f"{label}: cannot recover an exact integer from {value!r}")
    return nearest


def load_rows(results_dir: Path) -> list[dict]:
    expected = {results_dir / f"external_bloodmnist_seed{seed}.json" for seed in SEEDS}
    actual = set(results_dir.glob("external_bloodmnist_seed*.json"))
    if actual != expected:
        raise ValueError(f"ten-seed matrix mismatch: missing={sorted(p.name for p in expected-actual)}, extra={sorted(p.name for p in actual-expected)}")
    rows = []
    for seed in SEEDS:
        path = results_dir / f"external_bloodmnist_seed{seed}.json"
        # Legacy run JSON uses NaN for conditions with no singleton sample.
        # The two audited LAC cells below are separately required to be finite.
        payload = json.loads(path.read_text(encoding="utf-8"))
        if payload.get("dataset") != "bloodmnist" or payload.get("seed") != seed:
            raise ValueError(f"{path.name}: identity mismatch")
        for bins, condition in CONDITIONS:
            matches = [x for x in payload.get("results", [])
                       if x.get("method", "lac") == METHOD and x.get("bins") == bins]
            if len(matches) != 1:
                raise ValueError(f"{path.name}: expected one lac bins={bins} result")
            item = matches[0]
            n = item.get("n")
            fraction, risk = item.get("singleton_fraction"), item.get("singleton_selective_risk")
            if not isinstance(n, int) or n <= 0:
                raise ValueError(f"{path.name}: invalid n")
            if not all(isinstance(x, (int, float)) and math.isfinite(float(x))
                       for x in (fraction, risk)):
                raise ValueError(f"{path.name}/{condition}: non-finite audited metric")
            singleton = exact_count(n * float(fraction), f"{path.name}/{condition}/singleton")
            if singleton == 0:
                raise ValueError(f"{path.name}/{condition}: singleton risk is undefined")
            errors = exact_count(singleton * float(risk), f"{path.name}/{condition}/errors")
            correct = singleton - errors
            rows.append({"seed": seed, "condition": condition, "bins": bins,
                         "n_test": n, "n_singleton": singleton,
                         "n_singleton_correct": correct, "n_singleton_error": errors,
                         "singleton_fraction": singleton / n,
                         "singleton_selective_risk": errors / singleton,
                         "source_file": path.name,
                         "source_sha256": hashlib.sha256(path.read_bytes()).hexdigest()})
    return rows


def mean_ci(values: list[float]) -> dict:
    mean = statistics.fmean(values)
    sd = statistics.stdev(values)
    half = float(student_t.ppf(.975, len(values)-1)) * sd / math.sqrt(len(values))
    return {"n_seeds": len(values), "mean": mean, "ci95_low": mean-half,
            "ci95_high": mean+half, "sd": sd}


def analyse(rows: list[dict]) -> dict:
    summaries = {}
    for _, condition in CONDITIONS:
        selected = [r for r in rows if r["condition"] == condition]
        summaries[condition] = {
            "singleton_fraction": mean_ci([r["singleton_fraction"] for r in selected]),
            "singleton_selective_risk": mean_ci([r["singleton_selective_risk"] for r in selected]),
            "singleton_count": mean_ci([r["n_singleton"] for r in selected]),
        }
    by_seed = {r["seed"]: r for r in rows if r["condition"] == "pooled_lac"}
    quality = {r["seed"]: r for r in rows if r["condition"] == "quality_lac_3bins"}
    paired = []
    for seed in SEEDS:
        paired.append({"seed": seed,
                       "singleton_fraction_difference": quality[seed]["singleton_fraction"]-by_seed[seed]["singleton_fraction"],
                       "singleton_risk_difference": quality[seed]["singleton_selective_risk"]-by_seed[seed]["singleton_selective_risk"]})
    return {"protocol": "QualityConformal-BloodMNIST-singleton-audit-v1",
            "source_scope": "frozen external_bloodmnist_seed2026-2035 JSON only",
            "count_reconstruction": "n_singleton=round(n*singleton_fraction); n_error=round(n_singleton*risk), accepted only within 1e-7 of integer",
            "analysis_unit": "independent training/corruption seed",
            "per_seed": rows, "summaries": summaries,
            "paired_quality_minus_pooled": {
                "per_seed": paired,
                "singleton_fraction_difference": mean_ci([x["singleton_fraction_difference"] for x in paired]),
                "singleton_risk_difference": mean_ci([x["singleton_risk_difference"] for x in paired]),
            }}


def write_outputs(output_dir: Path, result: dict) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "bloodmnist_singleton_risk_audit.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False)+"\n", encoding="utf-8")
    rows = result["per_seed"]
    with (output_dir / "bloodmnist_singleton_risk_per_seed.csv").open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0])); writer.writeheader(); writer.writerows(rows)
    lines = ["# BloodMNIST 单标签选择性风险独立审计", "",
             "本审计只读取冻结的2026–2035十种子JSON，不重新训练，不修改论文主稿。", "",
             "## 逐种子计数", "",
             "| seed | 条件 | 总样本 | 单标签 | 正确 | 错误 | 单标签比例 | 选择性风险 |",
             "|---:|---|---:|---:|---:|---:|---:|---:|"]
    labels = {"pooled_lac": "pooled LAC", "quality_lac_3bins": "三层质量 LAC"}
    for r in rows:
        lines.append(f"| {r['seed']} | {labels[r['condition']]} | {r['n_test']} | {r['n_singleton']} | {r['n_singleton_correct']} | {r['n_singleton_error']} | {r['singleton_fraction']:.4f} | {r['singleton_selective_risk']:.4f} |")
    diff = result["paired_quality_minus_pooled"]
    lines += ["", "## 配对结果", ""]
    for label, key in (("单标签比例差", "singleton_fraction_difference"), ("选择性风险差", "singleton_risk_difference")):
        x = diff[key]
        lines.append(f"- {label}（三层质量 LAC − pooled LAC）：{x['mean']:+.4f}，95% t区间 [{x['ci95_low']:+.4f}, {x['ci95_high']:+.4f}]。")
    lines += ["", "## 可恢复性与限制", "",
              "JSON未直接保存单标签正确/错误整数计数，但同时保存了 n、singleton_fraction 和 singleton_selective_risk。本脚本仅在两次逆算都与整数误差不超过 1e-7 时接受计数，因而所有表中计数均可从现有JSON无歧义恢复。", "",
              "置信区间以十个独立训练/扰动seed的配对差为单位，没有将同一官方测试图像跨seed重复出现当作独立伯努利试验。"]
    (output_dir / "BLOODMNIST_SINGLETON_RISK_AUDIT_CN.md").write_text("\n".join(lines)+"\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--results-dir", type=Path, default=HERE / "results")
    parser.add_argument("--output-dir", type=Path, default=HERE / "results" / "singleton_risk_audit_v1")
    args = parser.parse_args(); result = analyse(load_rows(args.results_dir)); write_outputs(args.output_dir, result)
    print("BLOODMNIST_SINGLETON_AUDIT_COMPLETE")


if __name__ == "__main__":
    main()
