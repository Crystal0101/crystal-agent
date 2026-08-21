"""Five-class HAM10000 -> PAD-UFES-20 natural-domain experiment.

The external labels are never used for checkpoint, preprocessing, quality-bin
or conformal-method selection. Run ``--audit-only`` before any training.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import random
import sys
import time
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from PIL import Image
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms

HERE = Path(__file__).resolve().parent
DERMACAL = HERE.parent / "dermacal" / "experiments"
sys.path.insert(0, str(DERMACAL))
from src.models import build_model, save_checkpoint  # noqa: E402
from src.qaca import BRISQUENormalizer, compute_brisque  # noqa: E402

from natural_domain_data import (  # noqa: E402
    CANONICAL_CLASSES, Record, audit_protocol, sha256_file,
)
from quality_conformal import (  # noqa: E402
    AdaptiveQualityMondrianConformal, ClassConditionalConformal,
    QualityMondrianConformal, prediction_set_metrics,
)

MEAN, STD = [0.485, 0.456, 0.406], [0.229, 0.224, 0.225]


class ImageRecords(Dataset):
    def __init__(self, records: list[Record], transform):
        self.records, self.transform = records, transform

    def __len__(self):
        return len(self.records)

    def __getitem__(self, index):
        record = self.records[index]
        with Image.open(record.image_path) as source:
            image = source.convert("RGB")
        return self.transform(image), record.label, index


def image_transforms(image_size: int, train: bool):
    if train:
        return transforms.Compose([
            transforms.RandomResizedCrop(image_size, scale=(0.8, 1.0)),
            transforms.RandomHorizontalFlip(),
            transforms.ColorJitter(brightness=.2, contrast=.2, saturation=.2),
            transforms.ToTensor(), transforms.Normalize(MEAN, STD)])
    return transforms.Compose([
        transforms.Resize(round(image_size * 1.14)), transforms.CenterCrop(image_size),
        transforms.ToTensor(), transforms.Normalize(MEAN, STD)])


def raw_quality(records: list[Record], image_size: int) -> np.ndarray:
    resize = transforms.Compose([
        transforms.Resize(round(image_size * 1.14)), transforms.CenterCrop(image_size)])
    values = []
    for record in records:
        with Image.open(record.image_path) as source:
            image = np.asarray(resize(source.convert("RGB")), dtype=np.uint8).copy()
        values.append(compute_brisque(image))
    values = np.asarray(values, dtype=np.float32)
    if not np.isfinite(values).all():
        raise ValueError("non-finite quality values")
    return values


def cached_raw_quality(records: list[Record], image_size: int, cache_dir: Path,
                       role: str, smoke: bool) -> np.ndarray:
    identity = "\n".join(record.image_id for record in records)
    digest = hashlib.sha256(identity.encode("utf-8")).hexdigest()
    suffix = "smoke" if smoke else "full"
    path = cache_dir / f"brisque_{role}_{image_size}_{suffix}.npz"
    if path.exists():
        cached = np.load(path)
        if str(cached["record_sha256"]) == digest and len(cached["values"]) == len(records):
            return cached["values"].astype(np.float32)
    values = raw_quality(records, image_size)
    np.savez_compressed(path, values=values, record_sha256=digest)
    return values


def collect(model, loader, device):
    model.eval(); logits, labels, indices = [], [], []
    with torch.no_grad():
        for images, target, index in loader:
            logits.append(model(images.to(device)).cpu().numpy())
            labels.append(target.numpy()); indices.append(index.numpy())
    return np.concatenate(logits), np.concatenate(labels), np.concatenate(indices)


def softmax(logits):
    shifted = logits - logits.max(axis=1, keepdims=True)
    exp = np.exp(shifted)
    return exp / exp.sum(axis=1, keepdims=True)


def exact_interval(successes: int, total: int, confidence=.95):
    from scipy.stats import beta
    alpha = 1 - confidence
    low = 0.0 if successes == 0 else beta.ppf(alpha / 2, successes, total - successes + 1)
    high = 1.0 if successes == total else beta.ppf(1 - alpha / 2, successes + 1, total - successes)
    return [float(low), float(high)]


def metrics_with_interval(sets, labels, predictions):
    result = prediction_set_metrics(sets, labels, predictions)
    successes = int(sets[np.arange(len(labels)), labels].sum())
    result["coverage_exact_95ci"] = exact_interval(successes, len(labels))
    return result


def evaluate_methods(pcal, ycal, qcal, ptest, ytest, qtest, quality_edges):
    methods = [
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
    output = []
    for name, method in methods:
        method.fit(pcal, ycal, qcal)
        sets = method.predict_sets(ptest, qtest)
        by_quality = {}
        ids = np.digitize(qtest, np.asarray(quality_edges), right=False)
        for stratum in range(len(quality_edges) + 1):
            mask = ids == stratum
            by_quality[str(stratum)] = metrics_with_interval(
                sets[mask], ytest[mask], ptest[mask].argmax(1))
        output.append({"method": name, "fit_summary": method.summary_.__dict__,
                       "overall": metrics_with_interval(sets, ytest, ptest.argmax(1)),
                       "by_quality": by_quality})
    class_method = ClassConditionalConformal(alpha=.1, min_class_size=30).fit(pcal, ycal)
    class_sets = class_method.predict_sets(ptest)
    output.append({"method": "class_conditional_lac",
                   "overall": metrics_with_interval(class_sets, ytest, ptest.argmax(1)),
                   "class_sizes": class_method.class_sizes_})
    confidence_method = QualityMondrianConformal(
        alpha=.1, n_quality_bins=3, min_bin_size=30).fit(pcal, ycal, pcal.max(1))
    confidence_sets = confidence_method.predict_sets(ptest, ptest.max(1))
    output.append({"method": "confidence_mondrian_control",
                   "overall": metrics_with_interval(
                       confidence_sets, ytest, ptest.argmax(1)),
                   "fit_summary": confidence_method.summary_.__dict__})
    return output


def train(model, train_loader, selection_loader, device, epochs, patience, checkpoint):
    counts = np.bincount([record.label for record in train_loader.dataset.records],
                         minlength=len(CANONICAL_CLASSES))
    weights = counts.sum() / (len(counts) * np.maximum(counts, 1))
    criterion = nn.CrossEntropyLoss(weight=torch.tensor(weights, dtype=torch.float32, device=device))
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4, weight_decay=1e-4)
    best, stale, history = float("inf"), 0, []
    for epoch in range(1, epochs + 1):
        model.train(); total_loss = total = 0
        start = time.time()
        for images, labels, _ in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad(); logits = model(images)
            loss = criterion(logits, labels); loss.backward(); optimizer.step()
            total_loss += loss.detach().item() * len(labels); total += len(labels)
        model.eval(); val_loss = val_total = 0
        with torch.no_grad():
            for images, labels, _ in selection_loader:
                images, labels = images.to(device), labels.to(device)
                loss = criterion(model(images), labels)
                val_loss += loss.detach().item() * len(labels); val_total += len(labels)
        row = {"epoch": epoch, "train_loss": total_loss / total,
               "selection_loss": val_loss / val_total,
               "seconds": time.time() - start}
        history.append(row); print(json.dumps(row), flush=True)
        if row["selection_loss"] < best:
            best, stale = row["selection_loss"], 0
            save_checkpoint(model, optimizer, epoch, str(checkpoint),
                            extra={"selection_loss": best, "num_classes": 5,
                                   "canonical_classes": list(CANONICAL_CLASSES)})
        else:
            stale += 1
            if stale >= patience: break
    state = torch.load(checkpoint, map_location=device, weights_only=False)
    model.load_state_dict(state["model_state_dict"])
    return history


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ham-root", type=Path,
                        default=DERMACAL / "data" / "HAM10000")
    parser.add_argument("--pad-root", type=Path,
                        default=HERE / "data" / "PAD_UFES_20")
    parser.add_argument("--model", choices=("resnet50", "efficientnet_b0", "vit_b_16"),
                        default="resnet50")
    parser.add_argument("--seed", type=int, default=2026)
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--patience", type=int, default=7)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--image-size", type=int, default=224)
    parser.add_argument("--device", default="mps" if torch.backends.mps.is_available() else "cpu")
    parser.add_argument("--audit-only", action="store_true")
    parser.add_argument("--smoke", action="store_true")
    parser.add_argument("--reuse-checkpoint", action="store_true")
    return parser.parse_args()


def balanced_smoke_subset(records: list[Record], per_class: int = 3) -> list[Record]:
    selected = []
    for label in range(len(CANONICAL_CLASSES)):
        selected.extend([row for row in records if row.label == label][:per_class])
    if len(selected) != per_class * len(CANONICAL_CLASSES):
        raise ValueError("smoke subset cannot represent all five classes")
    return selected


def main():
    args = parse_args()
    random.seed(args.seed); np.random.seed(args.seed); torch.manual_seed(args.seed)
    report, splits = audit_protocol(args.ham_root, args.pad_root, args.seed)
    output_dir = HERE / "results" / "natural_domain_v1"
    output_dir.mkdir(parents=True, exist_ok=True)
    audit_path = output_dir / "data_audit.json"
    audit_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"audit saved: {audit_path}", flush=True)
    if args.audit_only: return
    if args.smoke:
        args.epochs = 1; args.patience = 1; args.image_size = 64
        splits = {name: balanced_smoke_subset(rows) for name, rows in splits.items()}
    train_ds = ImageRecords(splits["train"], image_transforms(args.image_size, True))
    eval_transform = image_transforms(args.image_size, False)
    datasets = {name: ImageRecords(splits[name], eval_transform)
                for name in ("selection", "calibration", "test", "external")}
    loader = lambda ds, shuffle=False: DataLoader(
        ds, batch_size=args.batch_size, shuffle=shuffle, num_workers=0)
    model = build_model(args.model, num_classes=5, pretrained=not args.smoke).to(args.device)
    checkpoint = output_dir / (
        f"{args.model}_five_class_seed{args.seed}{'_smoke' if args.smoke else ''}.pt")
    if args.reuse_checkpoint and checkpoint.exists():
        state = torch.load(checkpoint, map_location=args.device, weights_only=False)
        if state.get("num_classes") != 5: raise ValueError("checkpoint is not five-class")
        model.load_state_dict(state["model_state_dict"]); history = []
    else:
        history = train(model, loader(train_ds, True), loader(datasets["selection"]),
                        args.device, args.epochs, args.patience, checkpoint)
    logits, labels, indices, raw = {}, {}, {}, {}
    for name, dataset in datasets.items():
        logits[name], labels[name], indices[name] = collect(model, loader(dataset), args.device)
        raw[name] = cached_raw_quality(
            dataset.records, args.image_size, output_dir, name, args.smoke)
    normalizer = BRISQUENormalizer().fit(raw["calibration"])
    quality = {name: normalizer.transform(values) for name, values in raw.items()}
    probs = {name: softmax(values) for name, values in logits.items()}
    quality_edges = np.unique(np.quantile(quality["calibration"], [1/3, 2/3])).tolist()
    if len(quality_edges) != 2: raise ValueError("calibration quality has degenerate tertiles")
    evaluations = {}
    for name in ("test", "external"):
        evaluations[name] = evaluate_methods(
            probs["calibration"], labels["calibration"], quality["calibration"],
            probs[name], labels[name], quality[name], quality_edges)
    payload = {
        "protocol": report["protocol"], "model": args.model, "seed": args.seed,
        "device": args.device, "smoke": args.smoke, "classes": list(CANONICAL_CLASSES),
        "checkpoint": str(checkpoint), "checkpoint_sha256": sha256_file(checkpoint),
        "quality_normalizer": {"p5": normalizer._lo, "p95": normalizer._hi,
                               "edges": quality_edges},
        "external_quality_clipping": {
            "low": float((quality["external"] <= 0).mean()),
            "high": float((quality["external"] >= 1).mean())},
        "training_history": history, "evaluations": evaluations,
    }
    target = output_dir / f"{args.model}_seed{args.seed}{'_smoke' if args.smoke else ''}.json"
    target.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"result saved: {target}", flush=True)


if __name__ == "__main__":
    main()
