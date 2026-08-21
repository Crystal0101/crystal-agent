#!/usr/bin/env python3
"""Strictly integrate clustered natural-domain intervals into the Chinese master."""

from __future__ import annotations

import hashlib
import fcntl
import json
import os
import csv
import tempfile
from contextlib import ExitStack, contextmanager
from pathlib import Path

import analyze_natural_domain as analysis


HERE = Path(__file__).resolve().parent
PAPER = HERE / "PAPER_DRAFT_CN_v0.2.md"
AUDIT_DIR = HERE / "results" / "natural_domain_v1" / "cluster_audit_v1"
MANIFEST = AUDIT_DIR / "integration_manifest.json"
LOCK = AUDIT_DIR / ".integration.lock"
ANALYSIS_DIR = analysis.OUTPUT
VERSION = "qualityconformal-clustered-coverage-integration-v1"
OUTPUT_NAMES = (
    "run_level_metrics.csv",
    "RESULTS_SUMMARY_CN.md",
    "natural_domain_coverage_size.png",
    "natural_domain_coverage_size.pdf",
)
MODEL_LABELS = {
    "resnet50": "ResNet-50",
    "efficientnet_b0": "EfficientNet-B0",
    "vit_b_16": "ViT-B/16",
}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def replace_block(text: str, name: str, body: str) -> str:
    start = f"<!-- BEGIN AUTO {name} -->"
    end = f"<!-- END AUTO {name} -->"
    if text.count(start) != 1 or text.count(end) != 1:
        raise ValueError(f"expected exactly one marker pair: {name}")
    left, remainder = text.split(start, 1)
    _old, right = remainder.split(end, 1)
    return f"{left}{start}\n{body.rstrip()}\n{end}{right}"


def fmt_coverage(metric: dict) -> str:
    low, high = metric["cluster_bootstrap_95ci"]
    return f"{metric['estimate']:.3f} [{low:.3f},{high:.3f}]"


def build_status_block() -> str:
    return (
        "> 自然域病灶/患者聚类区间纠正已完成：三个冻结checkpoint均精确复现历史点估计，"
        "并生成10,000次cluster-bootstrap区间。该重分析只描述固定checkpoint、固定校准规则下"
        "测试样本的经验不确定性，不纳入训练或校准不确定性，也不恢复普通图像级split "
        "conformal覆盖保证；自然域结果仍是描述性压力测试。全稿仍需用户人工终审与投稿定位确认。"
    )


def build_results_block(audits: dict[str, dict]) -> str:
    lines = [
        "**表1｜HAM10000内部测试与PAD-UFES-20外部描述性压力测试。** 覆盖率括号内为10,000次group-bootstrap 95%区间；HAM10000以病灶、PAD-UFES-20以患者为重采样单位。区间只量化固定checkpoint、固定校准规则下测试样本的经验不确定性，不恢复普通图像级split conformal覆盖保证。集合大小报告点估计。三个架构各只有一个训练种子，不对架构均值作显著性检验。",
        "",
        "| 模型 | 内部pooled覆盖 | 内部质量覆盖 | 内部pooled/质量集合 | 外部pooled覆盖 | 外部质量覆盖 | 外部pooled/质量集合 |",
        "|---|---:|---:|---:|---:|---:|---:|",
    ]
    external_sensitivity = []
    for model in analysis.MODELS:
        audit = audits[model]
        test = audit["domains"]["test"]["methods"]
        external = audit["domains"]["external"]["methods"]
        pooled_test, quality_test = test["pooled_lac"], test["quality_lac"]
        pooled_ext, quality_ext = external["pooled_lac"], external["quality_lac"]
        lines.append(
            f"| {MODEL_LABELS[model]} | {fmt_coverage(pooled_test['coverage'])} | "
            f"{fmt_coverage(quality_test['coverage'])} | "
            f"{pooled_test['average_set_size']['estimate']:.3f}/"
            f"{quality_test['average_set_size']['estimate']:.3f} | "
            f"{fmt_coverage(pooled_ext['coverage'])} | "
            f"{fmt_coverage(quality_ext['coverage'])} | "
            f"{pooled_ext['average_set_size']['estimate']:.3f}/"
            f"{quality_ext['average_set_size']['estimate']:.3f} |"
        )
        p_sens = pooled_ext["coverage"]["one_image_per_group_sensitivity"]["coverage"]
        q_sens = quality_ext["coverage"]["one_image_per_group_sensitivity"]["coverage"]
        external_sensitivity.append(
            f"{MODEL_LABELS[model]} {p_sens:.3f}/{q_sens:.3f}"
        )
    lines += [
        "",
        "三份v2聚类审计均绑定正式JSON、当前冻结checkpoint、数据审计、冻结质量缓存和关键代码SHA-256，并逐模型、逐域、逐方法精确复现历史指标后才计算区间。每位外部患者按字典序固定抽取一张图像的pooled/quality LAC覆盖敏感性依次为："
        + "；".join(external_sensitivity)
        + "。该敏感性改变了目标总体，只用于检查多图像患者是否主导结论。",
    ]
    return "\n".join(lines)


def atomic_write_bytes(path: Path, payload: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    try:
        with temporary.open("wb") as handle:
            handle.write(payload)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()


def atomic_write(path: Path, text: str) -> None:
    atomic_write_bytes(path, text.encode("utf-8"))


@contextmanager
def exclusive_lock(path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a+b") as handle:
        fcntl.flock(handle.fileno(), fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(handle.fileno(), fcntl.LOCK_UN)


@contextmanager
def frozen_audit_snapshot():
    """Hold every producer lock so audits cannot change during integration."""
    with ExitStack() as stack:
        for model in analysis.MODELS:
            target = AUDIT_DIR / f"{model}_clustered_coverage.json"
            stack.enter_context(exclusive_lock(target.with_name(f".{target.name}.lock")))
        yield


def _target_content(path: Path) -> bytes | None:
    if path.is_symlink():
        raise ValueError(f"integration target is a symlink: {path}")
    if not path.exists():
        return None
    if not path.is_file():
        raise ValueError(f"integration target is not a regular file: {path}")
    return path.read_bytes()


def _assert_target_states(originals: dict[Path, bytes | None],
                          desired: dict[Path, bytes],
                          changed: set[Path]) -> None:
    drifted = []
    for target, original in originals.items():
        expected = desired[target] if target in changed else original
        if _target_content(target) != expected:
            drifted.append(str(target))
    if drifted:
        raise RuntimeError(
            "cluster integration concurrent target drift detected; refusing overwrite: "
            + ", ".join(drifted[:3])
        )


def _validate_staged_outputs(output_dir: Path) -> tuple[Path, ...]:
    output_files = tuple(output_dir / name for name in OUTPUT_NAMES)
    actual = {path.name for path in output_dir.iterdir() if path.is_file()}
    if actual != set(OUTPUT_NAMES):
        raise ValueError("staged analysis output set is incomplete or unexpected")
    for path in output_files:
        if path.is_symlink() or not path.is_file() or path.stat().st_size <= 0:
            raise ValueError(f"invalid staged analysis output: {path}")
    with output_files[0].open(encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    expected_matrix = {
        (model, domain, method)
        for model in analysis.MODELS
        for domain in analysis.DOMAINS
        for method in analysis.METHODS
    }
    observed_matrix = {
        (row.get("model"), row.get("domain"), row.get("method")) for row in rows
    }
    if len(rows) != len(expected_matrix) or observed_matrix != expected_matrix:
        raise ValueError("staged run-level CSV does not contain the exact result matrix")
    if not output_files[1].read_text(encoding="utf-8").startswith(
            "# QualityConformal自然域结果摘要\n"):
        raise ValueError("staged Chinese result summary identity mismatch")
    if not output_files[2].read_bytes().startswith(b"\x89PNG\r\n\x1a\n"):
        raise ValueError("staged PNG signature mismatch")
    if not output_files[3].read_bytes().startswith(b"%PDF-"):
        raise ValueError("staged PDF signature mismatch")
    return output_files


def _build_manifest(*, staged_outputs: tuple[Path, ...],
                    final_outputs: tuple[Path, ...], manuscript_bytes: bytes,
                    source_manuscript_bytes: bytes, plotter_path: Path) -> dict:
    return {
        "version": VERSION,
        "cluster_audits_sha256": {
            model: sha256_file(AUDIT_DIR / f"{model}_clustered_coverage.json")
            for model in analysis.MODELS
        },
        "analysis_outputs_sha256": {
            str(final.relative_to(HERE)): sha256_file(staged)
            for staged, final in zip(staged_outputs, final_outputs)
        },
        "manuscript_sha256": hashlib.sha256(manuscript_bytes).hexdigest(),
        "source_manuscript_sha256": hashlib.sha256(source_manuscript_bytes).hexdigest(),
        "integrator_sha256": sha256_file(Path(__file__).resolve()),
        "analyzer_sha256": sha256_file(Path(analysis.__file__).resolve()),
        "plotter_sha256": sha256_file(plotter_path),
        "transaction_policy": (
            "same_filesystem_stage_validate_rollback_manifest_last_under_exclusive_lock"
        ),
        "publication_order": [*OUTPUT_NAMES, PAPER.name, MANIFEST.name],
        "evidence_scope": "descriptive_fixed_checkpoint_fixed_calibration_stress_test",
    }


def _commit_transaction(staged: list[tuple[Path, Path]],
                        originals: dict[Path, bytes | None],
                        rollback_dir: Path) -> None:
    """Publish staged files in order and restore every prior byte on failure."""
    targets = [target for _source, target in staged]
    if len(set(targets)) != len(targets) or not targets or targets[-1] != MANIFEST:
        raise ValueError("integration transaction must have unique targets and manifest last")
    if set(targets) != set(originals):
        raise ValueError("integration transaction target snapshot mismatch")
    if any(not target.parent.is_dir() for target in targets):
        raise FileNotFoundError("integration target parent directory is missing")
    desired = {}
    for source, target in staged:
        if source.is_symlink() or not source.is_file():
            raise ValueError(f"invalid staged transaction source: {source}")
        desired[target] = source.read_bytes()
    _assert_target_states(originals, desired, set())

    backups: dict[Path, Path] = {}
    for index, target in enumerate(targets):
        if originals[target] is not None:
            backup = rollback_dir / f"rollback-{index}.bin"
            atomic_write_bytes(backup, originals[target])
            backups[target] = backup

    changed: list[Path] = []
    changed_set: set[Path] = set()
    try:
        for source, target in staged:
            _assert_target_states(originals, desired, changed_set)
            if originals[target] == desired[target]:
                continue
            os.replace(source, target)
            changed.append(target)
            changed_set.add(target)
        _assert_target_states(originals, desired, changed_set)
    except BaseException as exc:
        rollback_errors = []
        for target in reversed(changed):
            try:
                current = _target_content(target)
                if current == originals[target]:
                    continue
                if current != desired[target]:
                    rollback_errors.append(f"{target}: concurrent drift preserved")
                elif originals[target] is None:
                    target.unlink()
                else:
                    os.replace(backups[target], target)
            except OSError as rollback_error:
                rollback_errors.append(f"{target}: {rollback_error}")
        if not rollback_errors:
            try:
                _assert_target_states(originals, desired, set())
            except (OSError, ValueError, RuntimeError) as rollback_error:
                rollback_errors.append(str(rollback_error))
        if rollback_errors:
            raise RuntimeError(
                "cluster integration failed and rollback was incomplete: "
                + "; ".join(rollback_errors)
            ) from exc
        raise


def _integrate_locked(plot_natural_domain) -> dict:
    payloads, audits = analysis.load()
    final_outputs = tuple(ANALYSIS_DIR / name for name in OUTPUT_NAMES)
    targets = (*final_outputs, PAPER, MANIFEST)
    originals = {target: _target_content(target) for target in targets}
    if originals[PAPER] is None:
        raise FileNotFoundError(f"Chinese master manuscript is missing: {PAPER}")
    original_bytes = originals[PAPER]
    original = original_bytes.decode("utf-8")
    updated = replace_block(original, "QUALITY CLUSTER STATUS", build_status_block())
    updated = replace_block(
        updated, "QUALITY CLUSTER RESULTS", build_results_block(audits)
    )
    updated_bytes = updated.encode("utf-8")

    with tempfile.TemporaryDirectory(
            prefix=".cluster-integration-", dir=AUDIT_DIR) as raw_stage:
        stage = Path(raw_stage)
        stage_outputs_dir = stage / "analysis_v1"
        analysis.analyse(payloads, audits, output_dir=stage_outputs_dir)
        plot_natural_domain.main(
            input_path=stage_outputs_dir / "run_level_metrics.csv",
            output_dir=stage_outputs_dir,
        )
        staged_outputs = _validate_staged_outputs(stage_outputs_dir)

        staged_paper = stage / "manuscript.md"
        atomic_write(staged_paper, updated)
        if staged_paper.read_bytes() != updated_bytes:
            raise RuntimeError("staged manuscript verification failed")
        manifest = _build_manifest(
            staged_outputs=staged_outputs,
            final_outputs=final_outputs,
            manuscript_bytes=updated_bytes,
            source_manuscript_bytes=original_bytes,
            plotter_path=Path(plot_natural_domain.__file__).resolve(),
        )
        staged_manifest = stage / "integration_manifest.json"
        manifest_text = json.dumps(
            manifest, ensure_ascii=False, indent=2, allow_nan=False
        ) + "\n"
        atomic_write(staged_manifest, manifest_text)
        if json.loads(staged_manifest.read_text(encoding="utf-8")) != manifest:
            raise RuntimeError("staged integration manifest verification failed")

        fresh_payloads, fresh_audits = analysis.load()
        if fresh_payloads != payloads or fresh_audits != audits:
            raise RuntimeError("validated inputs changed during integration staging")
        staged = [
            *(zip(staged_outputs, final_outputs)),
            (staged_paper, PAPER),
            (staged_manifest, MANIFEST),
        ]
        _commit_transaction(list(staged), originals, stage)
    return manifest


def main() -> int:
    import plot_natural_domain

    with exclusive_lock(LOCK), frozen_audit_snapshot():
        manifest = _integrate_locked(plot_natural_domain)
    print(json.dumps(manifest, ensure_ascii=False, allow_nan=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
