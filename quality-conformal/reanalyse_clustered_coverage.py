#!/usr/bin/env python3
"""Reconstruct prediction sets and estimate group-aware coverage intervals.

The frozen natural-domain JSON files contain image-level Clopper--Pearson
intervals, but HAM10000 can contain repeated images of one lesion and
PAD-UFES-20 can contain multiple images from one patient.  This script loads the
unchanged frozen checkpoints, exactly reproduces every stored point estimate,
then bootstraps lesion/patient groups.  It writes separate audit artifacts and
never mutates the historical formal result JSON files.
"""

from __future__ import annotations

import argparse
import fcntl
import hashlib
import io
import json
import os
import platform
import shutil
import sys
from contextlib import contextmanager
from pathlib import Path

import numpy as np
import torch
import torchvision
from scipy import stats
from torch.utils.data import DataLoader


HERE = Path(__file__).resolve().parent
DERMACAL = HERE.parent / "dermacal" / "experiments"
sys.path.insert(0, str(DERMACAL))

from src.models import build_model  # noqa: E402
from src.qaca import BRISQUENormalizer  # noqa: E402

from natural_domain_data import CANONICAL_CLASSES, audit_protocol, sha256_file  # noqa: E402
from quality_conformal import (  # noqa: E402
    AdaptiveQualityMondrianConformal,
    ClassConditionalConformal,
    QualityMondrianConformal,
)
from run_natural_domain import (  # noqa: E402
    ImageRecords,
    image_transforms,
    softmax,
)


RESULTS = HERE / "results" / "natural_domain_v1"
OUTPUT = RESULTS / "cluster_audit_v1"
MODELS = ("resnet50", "efficientnet_b0", "vit_b_16")
DOMAINS = ("test", "external")
METHODS = (
    "pooled_lac", "quality_lac", "pooled_aps", "quality_aps",
    "pooled_raps", "quality_raps", "class_conditional_lac",
    "confidence_mondrian_control",
)
VERSION = "qualityconformal-clustered-coverage-audit-v2"
BOOTSTRAP_SCHEME = "one_stage_nonparametric_resampling_of_whole_lesion_or_patient_groups"
BOOTSTRAP_ESTIMAND = "image_weighted_ratio_of_cluster_sums_to_cluster_counts"
BOOTSTRAP_SEED_SCHEME = "sha256_of_version_model_domain_method_stratum_metric"
ONE_IMAGE_RULE = "lexicographically_first_image_id_within_group"
CODE_PATHS = {
    "QualityConformal/reanalyse_clustered_coverage.py": Path(__file__).resolve(),
    "QualityConformal/run_natural_domain.py": HERE / "run_natural_domain.py",
    "QualityConformal/natural_domain_data.py": HERE / "natural_domain_data.py",
    "QualityConformal/quality_conformal.py": HERE / "quality_conformal.py",
    "DermaCal/experiments/src/models.py": DERMACAL / "src" / "models.py",
    "DermaCal/experiments/src/qaca.py": DERMACAL / "src" / "qaca.py",
}


def stable_seed(*parts: object) -> int:
    digest = hashlib.sha256("\0".join(map(str, parts)).encode("utf-8")).digest()
    return int.from_bytes(digest[:8], "big")


def current_code_sha256() -> dict[str, str]:
    return {name: sha256_file(path) for name, path in CODE_PATHS.items()}


def runtime_manifest(device: str) -> dict[str, str]:
    return {
        "python": platform.python_version(),
        "numpy": np.__version__,
        "scipy": __import__("scipy").__version__,
        "torch": torch.__version__,
        "torchvision": torchvision.__version__,
        "device": str(device),
    }


def read_json_snapshot(path: Path) -> tuple[dict, str]:
    raw = path.read_bytes()
    return json.loads(raw.decode("utf-8")), hashlib.sha256(raw).hexdigest()


@contextmanager
def exclusive_lock(path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a+b") as handle:
        fcntl.flock(handle.fileno(), fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(handle.fileno(), fcntl.LOCK_UN)


def load_frozen_raw_quality(records, role: str, *, image_size: int = 224,
                            cache_dir: Path = RESULTS) -> tuple[np.ndarray, str, Path]:
    """Load and bind a historical quality cache without mutating shared inputs."""
    path = cache_dir / f"brisque_{role}_{image_size}_full.npz"
    raw = path.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    identity = "\n".join(record.image_id for record in records)
    expected_identity = hashlib.sha256(identity.encode("utf-8")).hexdigest()
    with np.load(io.BytesIO(raw), allow_pickle=False) as cached:
        cached_identity = str(np.asarray(cached["record_sha256"]).item())
        values = np.asarray(cached["values"], dtype=np.float32).copy()
    if cached_identity != expected_identity or len(values) != len(records):
        raise ValueError(f"frozen quality cache identity mismatch: {path}")
    if not np.isfinite(values).all():
        raise ValueError(f"non-finite frozen quality values: {path}")
    return values, digest, path


def exact_interval(successes: int, trials: int, confidence: float = .95) -> list[float]:
    if not 0 <= successes <= trials or trials <= 0:
        raise ValueError("invalid binomial counts")
    alpha = 1 - confidence
    low = 0.0 if successes == 0 else float(
        stats.beta.ppf(alpha / 2, successes, trials - successes + 1)
    )
    high = 1.0 if successes == trials else float(
        stats.beta.ppf(1 - alpha / 2, successes + 1, trials - successes)
    )
    return [low, high]


def grouped_values(values: np.ndarray, group_ids: list[str]) -> tuple[np.ndarray, np.ndarray]:
    values = np.asarray(values, dtype=float)
    if values.ndim != 1 or len(values) != len(group_ids) or len(values) == 0:
        raise ValueError("values/group_ids must be non-empty aligned vectors")
    if not np.isfinite(values).all() or any(not str(group) for group in group_ids):
        raise ValueError("non-finite value or empty group identifier")
    unique = sorted(set(map(str, group_ids)))
    position = {group: index for index, group in enumerate(unique)}
    sums = np.zeros(len(unique), dtype=float)
    counts = np.zeros(len(unique), dtype=np.int64)
    for value, group in zip(values, group_ids):
        index = position[str(group)]
        sums[index] += float(value)
        counts[index] += 1
    if (counts <= 0).any():
        raise AssertionError("empty group after aggregation")
    return sums, counts


def cluster_bootstrap_interval(values: np.ndarray, group_ids: list[str], *,
                               replicates: int, seed: int,
                               confidence: float = .95) -> list[float]:
    """Percentile interval from a one-stage nonparametric group bootstrap."""
    if replicates < 100:
        raise ValueError("at least 100 bootstrap replicates are required")
    sums, counts = grouped_values(values, group_ids)
    n_groups = len(sums)
    if n_groups < 2:
        raise ValueError("at least two independent groups are required")
    rng = np.random.default_rng(seed)
    estimates = np.empty(replicates, dtype=float)
    chunk_size = max(1, min(512, replicates))
    for start in range(0, replicates, chunk_size):
        stop = min(start + chunk_size, replicates)
        draw = rng.integers(0, n_groups, size=(stop - start, n_groups))
        estimates[start:stop] = sums[draw].sum(axis=1) / counts[draw].sum(axis=1)
    alpha = 1 - confidence
    return [float(np.quantile(estimates, alpha / 2)),
            float(np.quantile(estimates, 1 - alpha / 2))]


def one_image_per_group(values: np.ndarray, group_ids: list[str],
                        image_ids: list[str]) -> dict[str, object]:
    """Deterministic sensitivity analysis using one lexical image per group."""
    values = np.asarray(values, dtype=float)
    if (len(values) == 0 or len(values) != len(group_ids)
            or len(values) != len(image_ids)):
        raise ValueError("one-image sensitivity vectors are not aligned")
    if (not np.isfinite(values).all() or not np.isin(values, (0.0, 1.0)).all()
            or any(not str(group) for group in group_ids)
            or any(not str(image) for image in image_ids)):
        raise ValueError("one-image coverage sensitivity requires finite binary values and IDs")
    selected: dict[str, tuple[str, float]] = {}
    for value, group, image in zip(values, group_ids, image_ids):
        group, image = str(group), str(image)
        current = selected.get(group)
        candidate = (image, float(value))
        if current is None or candidate[0] < current[0]:
            selected[group] = candidate
    chosen = np.asarray([selected[group][1] for group in sorted(selected)], dtype=float)
    successes = int(chosen.sum())
    return {
        "selection_rule": ONE_IMAGE_RULE,
        "n_groups": int(len(chosen)),
        "covered_groups": successes,
        "coverage": float(chosen.mean()),
        "group_level_exact_95ci": exact_interval(successes, len(chosen)),
    }


def prediction_sets(pcal: np.ndarray, ycal: np.ndarray, qcal: np.ndarray,
                    ptest: np.ndarray, qtest: np.ndarray,
                    quality_edges: list[float]) -> dict[str, np.ndarray]:
    configured = [
        ("pooled_lac", QualityMondrianConformal(alpha=.1, n_quality_bins=1)),
        ("quality_lac", QualityMondrianConformal(
            alpha=.1, n_quality_bins=3, min_bin_size=30, quality_edges=quality_edges)),
        ("pooled_aps", AdaptiveQualityMondrianConformal(alpha=.1, n_quality_bins=1)),
        ("quality_aps", AdaptiveQualityMondrianConformal(
            alpha=.1, n_quality_bins=3, min_bin_size=30, quality_edges=quality_edges)),
        ("pooled_raps", AdaptiveQualityMondrianConformal(
            alpha=.1, n_quality_bins=1, penalty=.01, regularization_rank=3)),
        ("quality_raps", AdaptiveQualityMondrianConformal(
            alpha=.1, n_quality_bins=3, min_bin_size=30, penalty=.01,
            regularization_rank=3, quality_edges=quality_edges)),
    ]
    output = {}
    for name, method in configured:
        output[name] = method.fit(pcal, ycal, qcal).predict_sets(ptest, qtest)
    class_method = ClassConditionalConformal(alpha=.1, min_class_size=30).fit(pcal, ycal)
    output["class_conditional_lac"] = class_method.predict_sets(ptest)
    confidence_method = QualityMondrianConformal(
        alpha=.1, n_quality_bins=3, min_bin_size=30
    ).fit(pcal, ycal, pcal.max(1))
    output["confidence_mondrian_control"] = confidence_method.predict_sets(
        ptest, ptest.max(1)
    )
    if tuple(output) != METHODS:
        raise AssertionError("method order drift")
    return output


def aligned_collect(model, records, transform, batch_size: int, device: str, *,
                    model_name: str, role: str,
                    progress_every_batches: int = 10):
    if progress_every_batches <= 0:
        raise ValueError("progress interval must be positive")
    dataset = ImageRecords(records, transform)
    loader = DataLoader(dataset, batch_size=batch_size, shuffle=False, num_workers=0)
    logits_parts, label_parts, index_parts = [], [], []
    total_batches = len(loader)
    print(
        f"[{model_name}] inference {role}: 0/{total_batches} batches "
        f"({len(records)} images)", flush=True,
    )
    model.eval()
    with torch.no_grad():
        for batch_index, (images, target, index) in enumerate(loader, start=1):
            logits_parts.append(model(images.to(device)).cpu().numpy())
            label_parts.append(target.numpy())
            index_parts.append(index.numpy())
            if (batch_index % progress_every_batches == 0
                    or batch_index == total_batches):
                print(
                    f"[{model_name}] inference {role}: "
                    f"{batch_index}/{total_batches} batches", flush=True,
                )
    logits = np.concatenate(logits_parts)
    labels = np.concatenate(label_parts)
    indices = np.concatenate(index_parts)
    order = np.argsort(indices)
    if not np.array_equal(indices[order], np.arange(len(records))):
        raise ValueError("loader indices are not a permutation of the frozen records")
    return logits[order], labels[order]


def summarise_vector(values: np.ndarray, groups: list[str], images: list[str], *,
                     replicates: int, seed_parts: tuple[object, ...],
                     binary: bool = False) -> dict[str, object]:
    return {
        "n_images": int(len(values)),
        "n_groups": int(len(set(groups))),
        "estimate": float(np.asarray(values, float).mean()),
        "cluster_bootstrap_95ci": cluster_bootstrap_interval(
            values, groups, replicates=replicates, seed=stable_seed(*seed_parts)
        ),
        "bootstrap_replicates": int(replicates),
        "one_image_per_group_sensitivity": one_image_per_group(
            values, groups, images
        ) if binary else None,
    }


def atomic_write(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    text = json.dumps(payload, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
    try:
        with temporary.open("w", encoding="utf-8", newline="") as handle:
            handle.write(text)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()


def same_number(left: object, right: object, *, atol: float = 1e-12) -> bool:
    left_value, right_value = float(left), float(right)
    if np.isnan(left_value) and np.isnan(right_value):
        return True
    return bool(np.isfinite(left_value) and np.isfinite(right_value)
                and abs(left_value - right_value) <= atol)


def _audit_model_unlocked(model_name: str, *, ham_root: Path, pad_root: Path,
                          device: str, batch_size: int, replicates: int,
                          progress_every_batches: int) -> Path:
    if replicates != 10_000:
        raise ValueError("formal v2 clustered audits require exactly 10,000 replicates")
    print(f"[{model_name}] stage 1/6: bind formal result and data audit", flush=True)
    formal_path = RESULTS / f"{model_name}_seed2026.json"
    formal, formal_sha256 = read_json_snapshot(formal_path)
    if (formal.get("protocol") != "qualityconformal-natural-domain-v1-five-class"
            or formal.get("model") != model_name or formal.get("seed") != 2026
            or formal.get("smoke") is not False
            or tuple(formal.get("classes", [])) != CANONICAL_CLASSES):
        raise ValueError(f"formal identity mismatch: {formal_path}")
    if device != formal.get("device"):
        raise ValueError(
            f"reconstruction device mismatch: requested={device!r}, "
            f"historical={formal.get('device')!r}; exact APS/RAPS point-estimate "
            "reproduction requires the frozen inference backend"
        )
    data_audit_path = RESULTS / "data_audit.json"
    stored_audit, data_audit_sha256 = read_json_snapshot(data_audit_path)
    report, splits = audit_protocol(ham_root, pad_root, 2026)
    if report != stored_audit:
        raise ValueError("current data audit differs from the frozen data_audit.json")

    print(f"[{model_name}] stage 2/6: bind checkpoint, code, and caches", flush=True)
    checkpoint = RESULTS / f"{model_name}_five_class_seed2026.pt"
    checkpoint_sha256 = sha256_file(checkpoint)
    if checkpoint_sha256 != formal.get("checkpoint_sha256"):
        raise ValueError(f"checkpoint hash mismatch: {checkpoint}")
    code_sha256 = current_code_sha256()
    model = build_model(model_name, num_classes=5, pretrained=False).to(device)
    state = torch.load(checkpoint, map_location=device, weights_only=False)
    if (state.get("num_classes") != 5
            or tuple(state.get("canonical_classes", [])) != CANONICAL_CLASSES):
        raise ValueError(f"checkpoint class mapping mismatch: {checkpoint}")
    model.load_state_dict(state["model_state_dict"])

    print(f"[{model_name}] stage 3/6: reconstruct frozen predictions", flush=True)
    transform = image_transforms(224, False)
    logits, labels, raw_quality = {}, {}, {}
    quality_cache_sha256, quality_cache_paths = {}, {}
    for role in ("calibration", "test", "external"):
        logits[role], labels[role] = aligned_collect(
            model, splits[role], transform, batch_size, device,
            model_name=model_name, role=role,
            progress_every_batches=progress_every_batches,
        )
        (raw_quality[role], quality_cache_sha256[role],
         quality_cache_paths[role]) = load_frozen_raw_quality(
            splits[role], role, image_size=224, cache_dir=RESULTS
        )
    normalizer = BRISQUENormalizer().fit(raw_quality["calibration"])
    quality = {role: normalizer.transform(values) for role, values in raw_quality.items()}
    probabilities = {role: softmax(values) for role, values in logits.items()}
    edges = np.unique(np.quantile(quality["calibration"], [1 / 3, 2 / 3])).tolist()
    frozen_normalizer = formal["quality_normalizer"]
    if (not np.allclose([normalizer._lo, normalizer._hi],
                        [frozen_normalizer["p5"], frozen_normalizer["p95"]],
                        rtol=0, atol=1e-12)
            or not np.allclose(edges, frozen_normalizer["edges"], rtol=0, atol=1e-12)):
        raise ValueError("quality normalizer/edge reproduction mismatch")
    current_clipping = {
        "low": float((quality["external"] <= 0).mean()),
        "high": float((quality["external"] >= 1).mean()),
    }
    if any(abs(current_clipping[key] - float(formal["external_quality_clipping"][key])) > 1e-12
           for key in ("low", "high")):
        raise ValueError("external quality clipping reproduction mismatch")
    for role in ("calibration", "test", "external"):
        expected_labels = np.asarray([record.label for record in splits[role]], dtype=np.int64)
        if not np.array_equal(labels[role], expected_labels):
            raise ValueError(f"label/order reproduction mismatch: {model_name} {role}")

    formal_lookup = {
        domain: {row["method"]: row for row in formal["evaluations"][domain]}
        for domain in DOMAINS
    }
    for domain in DOMAINS:
        if tuple(row.get("method") for row in formal["evaluations"][domain]) != METHODS:
            raise ValueError(f"formal method/order mismatch: {formal_path} {domain}")
    print(f"[{model_name}] stage 4/6: rebuild sets and clustered intervals", flush=True)
    output_domains = {}
    for domain in DOMAINS:
        print(f"[{model_name}] clustered analysis {domain}: build prediction sets", flush=True)
        sets_by_method = prediction_sets(
            probabilities["calibration"], labels["calibration"], quality["calibration"],
            probabilities[domain], quality[domain], edges,
        )
        groups = [record.group_id for record in splits[domain]]
        images = [record.image_id for record in splits[domain]]
        strata = np.digitize(quality[domain], np.asarray(edges), right=False)
        methods = {}
        for method_name, sets in sets_by_method.items():
            print(
                f"[{model_name}] clustered analysis {domain}/{method_name}: start",
                flush=True,
            )
            coverage = sets[np.arange(len(labels[domain])), labels[domain]].astype(float)
            set_size = sets.sum(axis=1).astype(float)
            singleton = set_size == 1
            point_predictions = probabilities[domain].argmax(axis=1)
            reconstructed = {
                "n": int(len(coverage)),
                "coverage": float(coverage.mean()),
                "average_set_size": float(set_size.mean()),
                "singleton_fraction": float(singleton.mean()),
                "empty_fraction": float((set_size == 0).mean()),
                "singleton_selective_risk": (
                    float((sets[singleton].argmax(axis=1)
                           != labels[domain][singleton]).mean())
                    if singleton.any() else float("nan")
                ),
                "point_error": float((point_predictions != labels[domain]).mean()),
            }
            historical_row = formal_lookup[domain][method_name]
            historical = historical_row["overall"]
            for metric_name, value in reconstructed.items():
                if not same_number(value, historical[metric_name]):
                    raise ValueError(
                        f"point-estimate reproduction failed: {model_name} {domain} "
                        f"{method_name} {metric_name}; reconstructed={value!r}, "
                        f"historical={historical[metric_name]!r}, "
                        f"difference={float(value) - float(historical[metric_name]):.17g}, "
                        f"reconstruction_device={device}, "
                        f"historical_device={formal.get('device')!r}"
                    )
            by_quality = {}
            for stratum in range(len(edges) + 1):
                mask = strata == stratum
                if "by_quality" in historical_row:
                    historical_stratum = historical_row["by_quality"][str(stratum)]
                    if (not same_number(coverage[mask].mean(),
                                        historical_stratum["coverage"])
                            or not same_number(set_size[mask].mean(),
                                               historical_stratum["average_set_size"])):
                        raise ValueError(
                            f"quality-stratum reproduction failed: {model_name} {domain} "
                            f"{method_name} {stratum}"
                        )
                by_quality[str(stratum)] = {
                    "coverage": summarise_vector(
                        coverage[mask], [g for g, keep in zip(groups, mask) if keep],
                        [i for i, keep in zip(images, mask) if keep], replicates=replicates,
                        seed_parts=(VERSION, model_name, domain, method_name, stratum, "coverage"),
                        binary=True,
                    ),
                    "average_set_size": summarise_vector(
                        set_size[mask], [g for g, keep in zip(groups, mask) if keep],
                        [i for i, keep in zip(images, mask) if keep], replicates=replicates,
                        seed_parts=(VERSION, model_name, domain, method_name, stratum, "set_size"),
                    ),
                }
            methods[method_name] = {
                "coverage": summarise_vector(
                    coverage, groups, images, replicates=replicates,
                    seed_parts=(VERSION, model_name, domain, method_name, "coverage"),
                    binary=True,
                ),
                "average_set_size": summarise_vector(
                    set_size, groups, images, replicates=replicates,
                    seed_parts=(VERSION, model_name, domain, method_name, "set_size"),
                ),
                "by_quality": by_quality,
            }
            print(
                f"[{model_name}] clustered analysis {domain}/{method_name}: complete",
                flush=True,
            )
        output_domains[domain] = {
            "group_unit": "HAM10000_lesion" if domain == "test" else "PAD_UFES_20_patient",
            "n_images": len(groups),
            "n_groups": len(set(groups)),
            "methods": methods,
        }

    print(f"[{model_name}] stage 5/6: assemble and recheck bindings", flush=True)
    payload = {
        "version": VERSION,
        "protocol": formal["protocol"],
        "model": model_name,
        "seed": 2026,
        "formal_result_sha256": formal_sha256,
        "checkpoint_sha256": checkpoint_sha256,
        "data_audit_sha256": data_audit_sha256,
        "quality_cache_sha256": quality_cache_sha256,
        "code_sha256": code_sha256,
        "runtime": runtime_manifest(device),
        "bootstrap": {
            "scheme": BOOTSTRAP_SCHEME,
            "estimand": BOOTSTRAP_ESTIMAND,
            "replicates": replicates,
            "confidence": .95,
            "seed_scheme": BOOTSTRAP_SEED_SCHEME,
        },
        "historical_interval_policy": (
            "Image-level Clopper-Pearson intervals in the frozen result JSON are retained "
            "for provenance but excluded from inference because images are clustered."
        ),
        "domains": output_domains,
    }
    target = OUTPUT / f"{model_name}_clustered_coverage.json"
    if sha256_file(formal_path) != formal_sha256:
        raise RuntimeError("formal result changed during clustered reanalysis")
    if sha256_file(checkpoint) != checkpoint_sha256:
        raise RuntimeError("checkpoint changed during clustered reanalysis")
    if sha256_file(data_audit_path) != data_audit_sha256:
        raise RuntimeError("data audit changed during clustered reanalysis")
    if current_code_sha256() != code_sha256:
        raise RuntimeError("critical code changed during clustered reanalysis")
    for role, path in quality_cache_paths.items():
        if sha256_file(path) != quality_cache_sha256[role]:
            raise RuntimeError(f"quality cache changed during clustered reanalysis: {role}")
    if target.exists():
        quarantine = OUTPUT / "quarantine"
        quarantine.mkdir(parents=True, exist_ok=True)
        previous_sha = sha256_file(target)[:12]
        preserved = quarantine / (
            f"{target.stem}.{previous_sha}.superseded.{os.getpid()}{target.suffix}"
        )
        if not preserved.exists():
            shutil.copy2(target, preserved)
    atomic_write(target, payload)
    print(f"[{model_name}] stage 6/6: atomically committed {target}", flush=True)
    return target


def existing_audit_is_current(model_name: str, *, replicates: int) -> bool:
    """Fail-closed validation used to resume a partially completed model queue."""
    target = OUTPUT / f"{model_name}_clustered_coverage.json"
    if replicates != 10_000 or not target.is_file():
        return False
    try:
        import analyze_natural_domain as analyzer

        payloads, audits = analyzer.load(models=(model_name,))
        if (len(payloads) != 1 or set(audits) != {model_name}
                or audits[model_name].get("version") != VERSION):
            raise ValueError("strict validator returned an incomplete audit")
    except (OSError, ValueError, RuntimeError, KeyError, TypeError) as exc:
        print(f"[{model_name}] existing audit rejected; recomputing: {exc}", flush=True)
        return False
    print(f"[{model_name}] existing v2 audit passed strict current-state validation", flush=True)
    return True


def audit_model(model_name: str, *, ham_root: Path, pad_root: Path, device: str,
                batch_size: int, replicates: int,
                progress_every_batches: int = 10,
                skip_if_current: bool = True) -> Path:
    target = OUTPUT / f"{model_name}_clustered_coverage.json"
    lock = target.with_name(f".{target.name}.lock")
    with exclusive_lock(lock):
        if skip_if_current and existing_audit_is_current(
                model_name, replicates=replicates):
            print(f"[{model_name}] skip: validated audit already complete", flush=True)
            return target
        return _audit_model_unlocked(
            model_name, ham_root=ham_root, pad_root=pad_root, device=device,
            batch_size=batch_size, replicates=replicates,
            progress_every_batches=progress_every_batches,
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", choices=(*MODELS, "all"), default="all")
    parser.add_argument("--ham-root", type=Path,
                        default=DERMACAL / "data" / "HAM10000")
    parser.add_argument("--pad-root", type=Path,
                        default=HERE / "data" / "PAD_UFES_20")
    parser.add_argument("--device", default="mps")
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--bootstrap-replicates", type=int, default=10_000)
    parser.add_argument("--progress-every-batches", type=int, default=10)
    parser.add_argument("--force", action="store_true",
                        help="recompute even when a strict current-state audit passes")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    selected = MODELS if args.model == "all" else (args.model,)
    for model_name in selected:
        print(f"[{model_name}] queue start", flush=True)
        target = audit_model(
            model_name, ham_root=args.ham_root, pad_root=args.pad_root,
            device=args.device, batch_size=args.batch_size,
            replicates=args.bootstrap_replicates,
            progress_every_batches=args.progress_every_batches,
            skip_if_current=not args.force,
        )
        print(f"validated and wrote {target}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
