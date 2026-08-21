"""Strictly validate and aggregate the frozen natural-domain study."""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import math
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
RESULTS = HERE / "results" / "natural_domain_v1"
OUTPUT = RESULTS / "analysis_v1"
CLUSTER_AUDIT = RESULTS / "cluster_audit_v1"
PROTOCOL = "qualityconformal-natural-domain-v1-five-class"
CLUSTER_VERSION = "qualityconformal-clustered-coverage-audit-v2"
MODELS = ("resnet50", "efficientnet_b0", "vit_b_16")
DOMAINS = ("test", "external")
METHODS = (
    "pooled_lac", "quality_lac", "pooled_aps", "quality_aps",
    "pooled_raps", "quality_raps", "class_conditional_lac",
    "confidence_mondrian_control",
)
CANONICAL_CLASSES = (
    "actinic_keratosis", "basal_cell_carcinoma", "melanoma", "nevus",
    "seborrheic_keratosis",
)
METRICS = (
    "n", "coverage", "average_set_size", "singleton_fraction",
    "empty_fraction", "singleton_selective_risk", "point_error",
)
BOOTSTRAP_SCHEME = "one_stage_nonparametric_resampling_of_whole_lesion_or_patient_groups"
BOOTSTRAP_ESTIMAND = "image_weighted_ratio_of_cluster_sums_to_cluster_counts"
BOOTSTRAP_SEED_SCHEME = "sha256_of_version_model_domain_method_stratum_metric"
ONE_IMAGE_RULE = "lexicographically_first_image_id_within_group"
DERMACAL = HERE.parent / "dermacal" / "experiments"
AUDIT_CODE_PATHS = {
    "QualityConformal/reanalyse_clustered_coverage.py": HERE / "reanalyse_clustered_coverage.py",
    "QualityConformal/run_natural_domain.py": HERE / "run_natural_domain.py",
    "QualityConformal/natural_domain_data.py": HERE / "natural_domain_data.py",
    "QualityConformal/quality_conformal.py": HERE / "quality_conformal.py",
    "DermaCal/experiments/src/models.py": DERMACAL / "src" / "models.py",
    "DermaCal/experiments/src/qaca.py": DERMACAL / "src" / "qaca.py",
}
QUALITY_CACHE_PATHS = {
    role: RESULTS / f"brisque_{role}_224_full.npz"
    for role in ("calibration", "test", "external")
}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_json_snapshot(path: Path) -> tuple[dict, str]:
    raw = path.read_bytes()
    return json.loads(raw.decode("utf-8")), hashlib.sha256(raw).hexdigest()


def current_audit_code_sha256() -> dict[str, str]:
    return {name: sha256_file(path) for name, path in AUDIT_CODE_PATHS.items()}


def atomic_write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    try:
        with temporary.open("w", encoding="utf-8", newline="") as handle:
            handle.write(text)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()


def _finite(value: object, context: str) -> float:
    if isinstance(value, bool):
        raise ValueError(f"boolean is not a numeric result: {context}")
    try:
        number = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"non-numeric result: {context}") from exc
    if not math.isfinite(number):
        raise ValueError(f"non-finite result: {context}")
    return number


def _positive_int(value: object, context: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
        raise ValueError(f"expected positive integer: {context}")
    return value


def _bounded(value: object, low: float, high: float, context: str) -> float:
    number = _finite(value, context)
    if not low <= number <= high:
        raise ValueError(f"result outside [{low}, {high}]: {context}")
    return number


def _interval(value: object, low: float, high: float, context: str) -> tuple[float, float]:
    if not isinstance(value, list) or len(value) != 2:
        raise ValueError(f"expected two-element interval: {context}")
    left = _bounded(value[0], low, high, f"{context}.low")
    right = _bounded(value[1], low, high, f"{context}.high")
    if left > right:
        raise ValueError(f"reversed interval: {context}")
    return left, right


def validate_bootstrap_metadata(bootstrap: object, context: str) -> None:
    if not isinstance(bootstrap, dict):
        raise ValueError(f"missing bootstrap metadata: {context}")
    expected = {
        "scheme": BOOTSTRAP_SCHEME,
        "estimand": BOOTSTRAP_ESTIMAND,
        "replicates": 10_000,
        "confidence": .95,
        "seed_scheme": BOOTSTRAP_SEED_SCHEME,
    }
    if bootstrap != expected:
        raise ValueError(f"cluster bootstrap metadata mismatch: {context}")


def validate_sensitivity(sensitivity: object, *, n_groups: int,
                         context: str) -> None:
    if not isinstance(sensitivity, dict):
        raise ValueError(f"missing one-image-per-group sensitivity: {context}")
    if sensitivity.get("selection_rule") != ONE_IMAGE_RULE:
        raise ValueError(f"sensitivity selection rule mismatch: {context}")
    if sensitivity.get("n_groups") != n_groups:
        raise ValueError(f"sensitivity group count mismatch: {context}")
    covered = sensitivity.get("covered_groups")
    if isinstance(covered, bool) or not isinstance(covered, int):
        raise ValueError(f"invalid covered-group count: {context}")
    if not 0 <= covered <= n_groups:
        raise ValueError(f"covered-group count outside range: {context}")
    coverage = _bounded(sensitivity.get("coverage"), 0, 1, f"{context}.coverage")
    if not math.isclose(coverage, covered / n_groups, rel_tol=0, abs_tol=1e-12):
        raise ValueError(f"sensitivity count/coverage mismatch: {context}")
    left, right = _interval(
        sensitivity.get("group_level_exact_95ci"), 0, 1, f"{context}.exact_ci"
    )
    if not left <= coverage <= right:
        raise ValueError(f"sensitivity estimate outside exact interval: {context}")


def validate_cluster_metric(metric: object, *, metric_name: str, n_images: int,
                            n_groups: int, context: str) -> None:
    if not isinstance(metric, dict):
        raise ValueError(f"missing clustered metric: {context}")
    if metric.get("n_images") != n_images or metric.get("n_groups") != n_groups:
        raise ValueError(f"clustered metric sample/group count mismatch: {context}")
    upper = 1.0 if metric_name == "coverage" else float(len(CANONICAL_CLASSES))
    estimate = _bounded(metric.get("estimate"), 0, upper, f"{context}.estimate")
    left, right = _interval(
        metric.get("cluster_bootstrap_95ci"), 0, upper, f"{context}.cluster_ci"
    )
    if not left <= estimate <= right:
        raise ValueError(f"estimate outside clustered interval: {context}")
    if metric.get("bootstrap_replicates") != 10_000:
        raise ValueError(f"bootstrap replicate mismatch: {context}")
    sensitivity = metric.get("one_image_per_group_sensitivity")
    if metric_name == "coverage":
        validate_sensitivity(sensitivity, n_groups=n_groups, context=context)
    elif sensitivity is not None:
        raise ValueError(f"unexpected set-size sensitivity: {context}")


def _validate_formal_overall(overall: object, *, n_images: int,
                             context: str) -> None:
    if not isinstance(overall, dict) or any(name not in overall for name in METRICS):
        raise ValueError(f"missing formal metric: {context}")
    if overall.get("n") != n_images:
        raise ValueError(f"formal image count mismatch: {context}")
    coverage = _bounded(overall.get("coverage"), 0, 1, f"{context}.coverage")
    _bounded(overall.get("average_set_size"), 0, len(CANONICAL_CLASSES),
             f"{context}.average_set_size")
    for name in ("singleton_fraction", "empty_fraction",
                 "singleton_selective_risk", "point_error"):
        _bounded(overall.get(name), 0, 1, f"{context}.{name}")
    left, right = _interval(overall.get("coverage_exact_95ci"), 0, 1,
                            f"{context}.historical_exact_ci")
    if not left <= coverage <= right:
        raise ValueError(f"formal coverage outside historical interval: {context}")


def _expected_domain_counts(data_audit: dict) -> dict[str, dict[str, int]]:
    try:
        raw = {
            "test": data_audit["ham_splits"]["test"],
            "external": data_audit["pad_external"],
        }
    except (KeyError, TypeError) as exc:
        raise ValueError("data audit lacks frozen domain counts") from exc
    expected: dict[str, dict[str, int]] = {}
    for domain, item in raw.items():
        expected[domain] = {
            "n_images": _positive_int(item.get("n_images"), f"data_audit.{domain}.n_images"),
            "n_groups": _positive_int(item.get("n_groups"), f"data_audit.{domain}.n_groups"),
        }
    return expected


def load(models: tuple[str, ...] = MODELS) -> tuple[list[dict], dict[str, dict]]:
    selected = tuple(models)
    if not selected or len(set(selected)) != len(selected) or any(
            model not in MODELS for model in selected):
        raise ValueError("models must be a non-empty unique subset of frozen models")
    payloads: list[dict] = []
    audits: dict[str, dict] = {}
    data_audit_path = RESULTS / "data_audit.json"
    data_audit, data_audit_sha = read_json_snapshot(data_audit_path)
    if (data_audit.get("protocol") != PROTOCOL
            or data_audit.get("seed") != 2026
            or tuple(data_audit.get("classes", [])) != CANONICAL_CLASSES):
        raise ValueError(f"data audit identity mismatch: {data_audit_path}")
    expected_counts = _expected_domain_counts(data_audit)
    current_code_sha = current_audit_code_sha256()
    current_cache_sha = {
        role: sha256_file(path) for role, path in QUALITY_CACHE_PATHS.items()
    }

    for model in selected:
        path = RESULTS / f"{model}_seed2026.json"
        item, formal_sha = read_json_snapshot(path)
        if (item.get("protocol") != PROTOCOL or item.get("smoke") is not False
                or item.get("model") != model or item.get("seed") != 2026
                or tuple(item.get("classes", [])) != CANONICAL_CLASSES):
            raise ValueError(f"formal identity mismatch: {path}")
        checkpoint = RESULTS / f"{model}_five_class_seed2026.pt"
        checkpoint_sha = sha256_file(checkpoint)
        if not item.get("checkpoint_sha256") or item["checkpoint_sha256"] != checkpoint_sha:
            raise ValueError(f"formal checkpoint binding mismatch: {path}")
        normalizer = item.get("quality_normalizer")
        if not isinstance(normalizer, dict):
            raise ValueError(f"missing frozen quality normalizer: {path}")
        p5 = _finite(normalizer.get("p5"), f"{path.name}.quality_normalizer.p5")
        p95 = _finite(normalizer.get("p95"), f"{path.name}.quality_normalizer.p95")
        edges = normalizer.get("edges")
        if (p5 >= p95 or not isinstance(edges, list) or len(edges) != 2
                or not 0 < _finite(edges[0], f"{path.name}.edge0")
                < _finite(edges[1], f"{path.name}.edge1") < 1):
            raise ValueError(f"invalid frozen quality normalizer: {path}")
        clipping = item.get("external_quality_clipping")
        if not isinstance(clipping, dict):
            raise ValueError(f"missing external quality clipping: {path}")
        for side in ("low", "high"):
            _bounded(clipping.get(side), 0, 1, f"{path.name}.quality_clip.{side}")
        for domain in DOMAINS:
            rows = item.get("evaluations", {}).get(domain, [])
            if tuple(row.get("method") for row in rows) != METHODS:
                raise ValueError(f"formal method/order mismatch: {path} {domain}")
            for row in rows:
                _validate_formal_overall(
                    row.get("overall"), n_images=expected_counts[domain]["n_images"],
                    context=f"{path.name}.{domain}.{row.get('method')}",
                )

        audit_path = CLUSTER_AUDIT / f"{model}_clustered_coverage.json"
        audit, audit_sha = read_json_snapshot(audit_path)
        if (audit.get("version") != CLUSTER_VERSION
                or audit.get("protocol") != PROTOCOL
                or audit.get("model") != model
                or audit.get("seed") != 2026):
            raise ValueError(f"cluster audit identity mismatch: {audit_path}")
        if audit.get("formal_result_sha256") != formal_sha:
            raise ValueError(f"cluster audit is stale for formal result: {audit_path}")
        if audit.get("checkpoint_sha256") != checkpoint_sha:
            raise ValueError(f"cluster audit checkpoint mismatch: {audit_path}")
        if audit.get("data_audit_sha256") != data_audit_sha:
            raise ValueError(f"cluster audit data binding mismatch: {audit_path}")
        if audit.get("quality_cache_sha256") != current_cache_sha:
            raise ValueError(f"cluster audit quality-cache binding mismatch: {audit_path}")
        if audit.get("code_sha256") != current_code_sha:
            raise ValueError(f"cluster audit critical-code binding mismatch: {audit_path}")
        runtime = audit.get("runtime")
        runtime_keys = ("python", "numpy", "scipy", "torch", "torchvision", "device")
        if (not isinstance(runtime, dict)
                or any(not isinstance(runtime.get(key), str) or not runtime[key]
                       for key in runtime_keys)):
            raise ValueError(f"cluster audit runtime metadata mismatch: {audit_path}")
        validate_bootstrap_metadata(audit.get("bootstrap"), str(audit_path))
        if set(audit.get("domains", {})) != set(DOMAINS):
            raise ValueError(f"cluster audit domain mismatch: {audit_path}")

        formal_lookup = {
            domain: {row["method"]: row for row in item["evaluations"][domain]}
            for domain in DOMAINS
        }
        for domain in DOMAINS:
            domain_audit = audit["domains"][domain]
            expected = expected_counts[domain]
            expected_unit = "HAM10000_lesion" if domain == "test" else "PAD_UFES_20_patient"
            if (domain_audit.get("group_unit") != expected_unit
                    or domain_audit.get("n_images") != expected["n_images"]
                    or domain_audit.get("n_groups") != expected["n_groups"]):
                raise ValueError(f"cluster domain metadata mismatch: {audit_path} {domain}")
            if set(domain_audit.get("methods", {})) != set(METHODS):
                raise ValueError(f"cluster method mismatch: {audit_path} {domain}")
            for method in METHODS:
                cluster = domain_audit["methods"][method]
                formal = formal_lookup[domain][method]["overall"]
                for metric_name, formal_name in (
                    ("coverage", "coverage"),
                    ("average_set_size", "average_set_size"),
                ):
                    metric = cluster.get(metric_name)
                    context = f"{audit_path.name}.{domain}.{method}.{metric_name}"
                    validate_cluster_metric(
                        metric, metric_name=metric_name,
                        n_images=expected["n_images"], n_groups=expected["n_groups"],
                        context=context,
                    )
                    if not math.isclose(float(metric["estimate"]), float(formal[formal_name]),
                                        rel_tol=0, abs_tol=1e-12):
                        raise ValueError(f"cluster point estimate mismatch: {context}")
                by_quality = cluster.get("by_quality")
                if not isinstance(by_quality, dict) or set(by_quality) != {"0", "1", "2"}:
                    raise ValueError(f"quality-stratum mismatch: {audit_path} {domain} {method}")
                for metric_name in ("coverage", "average_set_size"):
                    stratum_image_total = 0
                    for stratum in ("0", "1", "2"):
                        metric = by_quality[stratum].get(metric_name)
                        if not isinstance(metric, dict):
                            raise ValueError(f"missing stratum metric: {audit_path}")
                        n_images = _positive_int(
                            metric.get("n_images"),
                            f"{audit_path.name}.{domain}.{method}.{stratum}.{metric_name}.n_images",
                        )
                        n_groups = _positive_int(
                            metric.get("n_groups"),
                            f"{audit_path.name}.{domain}.{method}.{stratum}.{metric_name}.n_groups",
                        )
                        if n_groups > expected["n_groups"] or n_groups > n_images:
                            raise ValueError(f"invalid stratum group count: {audit_path}")
                        validate_cluster_metric(
                            metric, metric_name=metric_name, n_images=n_images,
                            n_groups=n_groups,
                            context=f"{audit_path.name}.{domain}.{method}.{stratum}.{metric_name}",
                        )
                        stratum_image_total += n_images
                    if stratum_image_total != expected["n_images"]:
                        raise ValueError(f"stratum image counts do not partition domain: {audit_path}")
        if sha256_file(audit_path) != audit_sha:
            raise RuntimeError(f"cluster audit changed during validation: {audit_path}")
        if sha256_file(path) != formal_sha or sha256_file(checkpoint) != checkpoint_sha:
            raise RuntimeError(f"formal result/checkpoint changed during validation: {model}")
        payloads.append(item)
        audits[model] = audit

    if (sha256_file(data_audit_path) != data_audit_sha
            or current_audit_code_sha256() != current_code_sha
            or {role: sha256_file(path) for role, path in QUALITY_CACHE_PATHS.items()}
            != current_cache_sha):
        raise RuntimeError("data audit, critical code, or quality cache changed during validation")
    return payloads, audits


def build_rows(payloads: list[dict], audits: dict[str, dict]) -> list[dict]:
    rows = []
    for item in payloads:
        for domain in DOMAINS:
            for result in item["evaluations"][domain]:
                overall = result["overall"]
                cluster = audits[item["model"]]["domains"][domain]["methods"][result["method"]]
                coverage_audit = cluster["coverage"]
                set_size_audit = cluster["average_set_size"]
                sensitivity = coverage_audit["one_image_per_group_sensitivity"]
                clipping = item["external_quality_clipping"] if domain == "external" else None
                rows.append({
                    "model": item["model"], "seed": item["seed"],
                    "domain": domain, "method": result["method"],
                    **{key: overall[key] for key in METRICS},
                    "coverage_cluster_ci_low": coverage_audit["cluster_bootstrap_95ci"][0],
                    "coverage_cluster_ci_high": coverage_audit["cluster_bootstrap_95ci"][1],
                    "set_size_cluster_ci_low": set_size_audit["cluster_bootstrap_95ci"][0],
                    "set_size_cluster_ci_high": set_size_audit["cluster_bootstrap_95ci"][1],
                    "n_groups": coverage_audit["n_groups"],
                    "one_image_per_group_coverage": sensitivity["coverage"],
                    "one_image_per_group_ci_low": sensitivity["group_level_exact_95ci"][0],
                    "one_image_per_group_ci_high": sensitivity["group_level_exact_95ci"][1],
                    "historical_image_exact_ci_low": overall["coverage_exact_95ci"][0],
                    "historical_image_exact_ci_high": overall["coverage_exact_95ci"][1],
                    "quality_clip_low": clipping["low"] if clipping else None,
                    "quality_clip_high": clipping["high"] if clipping else None,
                })
    return rows


def analyse(payloads: list[dict], audits: dict[str, dict], *,
            output_dir: Path | None = None) -> None:
    target_dir = OUTPUT if output_dir is None else Path(output_dir)
    rows = build_rows(payloads, audits)
    if not rows:
        raise ValueError("no validated rows to analyse")
    csv_buffer = io.StringIO(newline="")
    writer = csv.DictWriter(csv_buffer, fieldnames=list(rows[0]), lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    atomic_write_text(target_dir / "run_level_metrics.csv", csv_buffer.getvalue())

    lookup = {(r["model"], r["domain"], r["method"]): r for r in rows}
    test_groups = audits[MODELS[0]]["domains"]["test"]["n_groups"]
    external_groups = audits[MODELS[0]]["domains"]["external"]["n_groups"]
    clip = payloads[0]["external_quality_clipping"]
    lines = [
        "# QualityConformal自然域结果摘要", "",
        "- 三个正式模型JSON均通过协议、五分类映射、当前checkpoint哈希、方法集合与指标完整性校验。",
        f"- 三个v2聚类审计绑定当前正式JSON、checkpoint、数据审计、冻结质量缓存与关键代码哈希；HAM10000以{test_groups:,}个病灶、PAD-UFES-20以{external_groups:,}个患者为重采样单位。",
        "- 聚类bootstrap只描述固定checkpoint、固定校准规则下测试样本聚类重采样的经验不确定性；不纳入训练或校准不确定性，也不恢复普通图像级split conformal覆盖保证。",
        "- 历史JSON中的普通图像级Clopper–Pearson区间只保留作溯源，不进入论文推断。",
        "- HAM10000内部测试与PAD-UFES-20外部测试均为描述性压力测试；外部域不满足源域交换性，覆盖下降不解释为形式保证失效。",
        "- 三种架构是不同模型而非独立随机重复；不对三模型均值执行伪重复显著性检验。",
        f"- 外部图像质量低端裁剪率为{100 * clip['low']:.2f}%，高端裁剪率为{100 * clip['high']:.2f}%，说明源域拟合的质量尺度发生明显越界。",
        "", "## LAC主比较", "",
        "| 模型 | 域 | Pooled coverage | Quality coverage | Pooled size | Quality size | Δsize |",
        "|---|---|---:|---:|---:|---:|---:|",
    ]
    for model in MODELS:
        for domain in DOMAINS:
            pooled = lookup[(model, domain, "pooled_lac")]
            quality = lookup[(model, domain, "quality_lac")]
            lines.append(
                f"| {model} | {domain} | {pooled['coverage']:.3f} | "
                f"{quality['coverage']:.3f} | {pooled['average_set_size']:.3f} | "
                f"{quality['average_set_size']:.3f} | "
                f"{quality['average_set_size']-pooled['average_set_size']:+.3f} |"
            )
    lines += ["", "## 外部域全部方法", "",
              "| 模型 | 方法 | Coverage [group-bootstrap 95% CI] | Set size | Singleton risk |",
              "|---|---|---:|---:|---:|"]
    for model in MODELS:
        for method in METHODS:
            row = lookup[(model, "external", method)]
            lines.append(
                f"| {model} | {method} | {row['coverage']:.3f} "
                f"[{row['coverage_cluster_ci_low']:.3f},{row['coverage_cluster_ci_high']:.3f}] | "
                f"{row['average_set_size']:.3f} | {row['singleton_selective_risk']:.3f} |"
            )
    lines += [
        "", "## 证据边界", "",
        "- 内部域LAC接近目标覆盖，但quality-LAC相对pooled-LAC只改变−0.014至−0.009个标签，未形成实质效率改善。",
        "- 外部域quality-LAC相对pooled-LAC把集合增大0.092–0.099个标签，覆盖只提高0.014–0.024，仍远低于0.90。",
        "- APS/RAPS在外部域产生更大集合并提高覆盖，但三个模型仍未全部达到0.90；不能据此声称外部条件有效。",
        "- 结果支持自然域迁移失败与质量尺度越界的诊断结论，不支持质量分层恢复跨域覆盖。",
        "- 每组固定抽取一张图像的敏感性结果随同机器可读CSV报告；它改变目标总体，仅用于检查多图像组是否主导结论。",
    ]
    atomic_write_text(target_dir / "RESULTS_SUMMARY_CN.md", "\n".join(lines) + "\n")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--validate-only", action="store_true",
        help="validate all bound inputs without publishing analysis outputs",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    payloads, audits = load()
    if args.validate_only:
        print(f"validated {len(payloads)}/3 formal models; no outputs written")
    else:
        analyse(payloads, audits)
        print(f"validated {len(payloads)}/3 formal models; wrote {OUTPUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
