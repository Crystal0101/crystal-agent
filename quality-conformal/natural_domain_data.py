"""Data and protocol utilities for the HAM10000 -> PAD-UFES-20 study.

This module intentionally uses only the Python standard library for metadata
auditing.  Model code may depend on PyTorch, but label mapping, exclusions and
group separation can therefore be tested without importing the ML stack.
"""

from __future__ import annotations

import csv
import hashlib
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path


CANONICAL_CLASSES = (
    "actinic_keratosis",
    "basal_cell_carcinoma",
    "melanoma",
    "nevus",
    "seborrheic_keratosis",
)
CLASS_TO_INDEX = {name: index for index, name in enumerate(CANONICAL_CLASSES)}
HAM_LABEL_MAP = {
    "akiec": "actinic_keratosis",
    "bcc": "basal_cell_carcinoma",
    "mel": "melanoma",
    "nv": "nevus",
    "bkl": "seborrheic_keratosis",
}
PAD_LABEL_MAP = {
    "ACK": "actinic_keratosis",
    "BCC": "basal_cell_carcinoma",
    "MEL": "melanoma",
    "NEV": "nevus",
    "SEK": "seborrheic_keratosis",
}


@dataclass(frozen=True)
class Record:
    dataset: str
    image_id: str
    image_path: str
    group_id: str
    canonical_label: str

    @property
    def label(self) -> int:
        return CLASS_TO_INDEX[self.canonical_label]


def sha256_file(path: Path, chunk_size: int = 1024 * 1024) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(chunk_size), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def load_ham_records(root: Path) -> tuple[list[Record], dict]:
    metadata = root / "HAM10000_metadata.csv"
    image_dirs = (root / "HAM10000_images_part_1", root / "HAM10000_images_part_2")
    rows = _read_csv(metadata)
    records, excluded, missing = [], Counter(), []
    for row in rows:
        raw_label = row["dx"].strip().lower()
        if raw_label not in HAM_LABEL_MAP:
            excluded[raw_label] += 1
            continue
        image_id = row["image_id"].strip()
        matches = [directory / f"{image_id}.jpg" for directory in image_dirs]
        matches = [path for path in matches if path.exists()]
        if len(matches) != 1:
            missing.append({"image_id": image_id, "matches": len(matches)})
            continue
        records.append(Record(
            dataset="HAM10000", image_id=image_id,
            image_path=str(matches[0]), group_id=row["lesion_id"].strip(),
            canonical_label=HAM_LABEL_MAP[raw_label]))
    if missing:
        raise ValueError(f"HAM10000 image resolution failures: {missing[:10]}")
    return records, {
        "metadata": str(metadata), "metadata_sha256": sha256_file(metadata),
        "raw_rows": len(rows), "retained": len(records),
        "excluded_by_label": dict(excluded),
    }


def _pad_image_index(root: Path) -> dict[str, list[Path]]:
    index: dict[str, list[Path]] = defaultdict(list)
    for path in root.rglob("*.png"):
        if path.is_file():
            index[path.name].append(path)
    return index


def load_pad_records(root: Path) -> tuple[list[Record], dict]:
    metadata = root / "raw" / "metadata.csv"
    rows = _read_csv(metadata)
    index = _pad_image_index(root / "raw")
    records, excluded, failures = [], Counter(), []
    for row in rows:
        raw_label = row["diagnostic"].strip().upper()
        if raw_label not in PAD_LABEL_MAP:
            excluded[raw_label] += 1
            continue
        image_id = row["img_id"].strip()
        matches = index.get(image_id, [])
        if len(matches) != 1:
            failures.append({"image_id": image_id, "matches": len(matches)})
            continue
        # Patient is the conservative independence unit. Lesions from the same
        # patient must never be split across roles.
        group_id = row["patient_id"].strip()
        if not group_id:
            raise ValueError(f"PAD-UFES-20 missing patient_id for {image_id}")
        records.append(Record(
            dataset="PAD-UFES-20", image_id=image_id,
            image_path=str(matches[0]), group_id=group_id,
            canonical_label=PAD_LABEL_MAP[raw_label]))
    if failures:
        raise ValueError(f"PAD-UFES-20 image resolution failures: {failures[:10]}")
    return records, {
        "metadata": str(metadata), "metadata_sha256": sha256_file(metadata),
        "raw_rows": len(rows), "retained": len(records),
        "excluded_by_label": dict(excluded),
    }


def stratified_group_split(records: list[Record], seed: int = 2026,
                           fractions=(0.60, 0.10, 0.15, 0.15)) -> dict[str, list[Record]]:
    """Deterministically split groups within class into four disjoint roles."""
    import random

    names = ("train", "selection", "calibration", "test")
    if len(fractions) != 4 or abs(sum(fractions) - 1.0) > 1e-9:
        raise ValueError("fractions must contain four values summing to one")
    grouped: dict[str, dict[str, list[Record]]] = defaultdict(lambda: defaultdict(list))
    for record in records:
        grouped[record.canonical_label][record.group_id].append(record)
    output = {name: [] for name in names}
    for class_index, class_name in enumerate(CANONICAL_CLASSES):
        groups = sorted(grouped[class_name])
        rng = random.Random(seed + class_index * 1009)
        rng.shuffle(groups)
        n = len(groups)
        cuts = [round(n * fractions[0]), round(n * sum(fractions[:2])),
                round(n * sum(fractions[:3]))]
        # Each common class has ample HAM10000 lesions. Explicitly fail rather
        # than silently produce an empty calibration or test class.
        partitions = (groups[:cuts[0]], groups[cuts[0]:cuts[1]],
                      groups[cuts[1]:cuts[2]], groups[cuts[2]:])
        if any(not part for part in partitions):
            raise ValueError(f"class {class_name} has too few groups for four roles")
        for name, part in zip(names, partitions):
            for group_id in part:
                output[name].extend(grouped[class_name][group_id])
    assert_group_disjoint(output)
    return output


def assert_group_disjoint(splits: dict[str, list[Record]]) -> None:
    groups = {name: {record.group_id for record in records}
              for name, records in splits.items()}
    names = list(groups)
    for i, left in enumerate(names):
        for right in names[i + 1:]:
            overlap = groups[left] & groups[right]
            if overlap:
                raise AssertionError(f"group leakage between {left} and {right}: {sorted(overlap)[:5]}")


def summarise_records(records: list[Record]) -> dict:
    groups_by_class: dict[str, set[str]] = defaultdict(set)
    for record in records:
        groups_by_class[record.canonical_label].add(record.group_id)
    return {
        "n_images": len(records),
        "n_groups": len({record.group_id for record in records}),
        "class_images": dict(sorted(Counter(record.canonical_label for record in records).items())),
        "class_groups": {name: len(groups_by_class[name]) for name in CANONICAL_CLASSES},
    }


def audit_protocol(ham_root: Path, pad_root: Path, seed: int = 2026) -> tuple[dict, dict[str, list[Record]]]:
    ham, ham_meta = load_ham_records(ham_root)
    pad, pad_meta = load_pad_records(pad_root)
    splits = stratified_group_split(ham, seed=seed)
    report = {
        "protocol": "qualityconformal-natural-domain-v1-five-class",
        "seed": seed, "classes": list(CANONICAL_CLASSES),
        "ham": ham_meta, "pad": pad_meta,
        "ham_splits": {name: summarise_records(rows) for name, rows in splits.items()},
        "pad_external": summarise_records(pad),
    }
    return report, {**splits, "external": pad}
