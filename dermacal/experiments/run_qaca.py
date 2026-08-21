"""
Fit and evaluate QACA for one model.
Requires benchmark logits/labels already saved by run_benchmark.py.
Usage:
  python run_qaca.py --model resnet50 --data_root data/HAM10000
"""
import argparse
import json
import numpy as np
from pathlib import Path

import torch

from src.dataset import load_splits, get_loader, get_transforms, HAM10000Dataset, denormalize_to_uint8
from src.models import build_model, get_device, load_checkpoint
from src.corrupt import CORRUPTION_NAMES, SEVERITIES
from src.evaluate import softmax_np, collect_logits, _compute_brisque_batch, CorruptedDataset
from src.qaca import QACA, BRISQUENormalizer, compute_brisque
from src.metrics import compute_all


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument('--model',      required=True)
    p.add_argument('--ckpt',       required=True)
    p.add_argument('--data_root',  default='data/HAM10000')
    p.add_argument('--batch_size', type=int, default=64)
    p.add_argument('--seed',       type=int, default=42)
    p.add_argument('--in_dir',     default='results/corrupted',
                   help='Directory containing benchmark logits (from run_benchmark.py)')
    p.add_argument('--out_dir',    default='results/qaca')
    return p.parse_args()


def main():
    args = parse_args()
    device = get_device()
    in_dir  = Path(args.in_dir)  / args.model
    out_dir = Path(args.out_dir) / args.model
    out_dir.mkdir(parents=True, exist_ok=True)

    _, val_ds, test_ds, _ = load_splits(args.data_root, seed=args.seed)
    val_transform  = get_transforms('val')
    test_transform = get_transforms('test')

    # Raw (transform=None) views for the corruption/BRISQUE pipeline — see
    # run_benchmark.py for why: CorruptedDataset and the BRISQUE collectors
    # need un-normalized PIL images, not the already-Normalize()'d tensors
    # that val_ds/test_ds return by default.
    val_ds_raw  = HAM10000Dataset(val_ds.df,  val_ds.img_dirs,  transform=None)
    test_ds_raw = HAM10000Dataset(test_ds.df, test_ds.img_dirs, transform=None)

    model = build_model(args.model).to(device)
    load_checkpoint(model, f"results/baseline/{args.model}/best.pt", device)

    print("Collecting val logits (clean)...")
    val_loader = get_loader(val_ds, args.batch_size, shuffle=False)
    val_logits_clean, val_labels_clean = collect_logits(model, val_loader, device)

    # BRISQUE normalizer from validation set
    print("Computing BRISQUE on val set...")
    val_brisque_raw = _collect_brisque_raw(val_ds_raw, val_transform)
    normalizer = BRISQUENormalizer()
    normalizer.fit(val_brisque_raw)
    val_quality = normalizer.transform(val_brisque_raw)

    # Collect mixed-quality val logits (apply all corruptions to val set)
    print("Building mixed-quality validation set...")
    mixed_logits, mixed_labels, mixed_quality = [], [], []
    for name in CORRUPTION_NAMES:
        for sev in SEVERITIES:
            ds = CorruptedDataset(val_ds_raw, name, sev, val_transform)
            loader = torch.utils.data.DataLoader(
                ds, batch_size=args.batch_size, shuffle=False, num_workers=4)
            logits, labels = collect_logits(model, loader, device)
            brisque_raw = _collect_brisque_raw_from_ds(ds)
            quality = normalizer.transform(brisque_raw)
            mixed_logits.append(logits)
            mixed_labels.append(labels)
            mixed_quality.append(quality)

    mixed_logits  = np.concatenate(mixed_logits)
    mixed_labels  = np.concatenate(mixed_labels)
    mixed_quality = np.concatenate(mixed_quality)

    # Fit QACA
    qaca = QACA()
    qaca.fit(val_logits_clean, val_labels_clean,
             mixed_logits, mixed_labels, mixed_quality)
    qaca.save(str(out_dir / 'qaca_params.npy'))
    normalizer.save(str(out_dir / 'brisque_normalizer.npy'))

    print(f"QACA fitted: T_base={qaca.T_base:.4f}  alpha={qaca.alpha:.4f}")

    # ── Evaluate on test set ────────────────────────────────────────────────────
    results = []

    # Clean
    clean_logits = np.load(in_dir / 'clean_logits.npy')
    clean_labels = np.load(in_dir / 'clean_labels.npy')
    clean_brisque = _collect_brisque_raw(test_ds_raw, test_transform)
    clean_quality = normalizer.transform(clean_brisque)

    for method, get_probs in [
        ('uncalibrated', lambda l, q: softmax_np(l)),
        ('temperature',  lambda l, q: softmax_np(l / qaca.T_base)),
        ('qaca',         lambda l, q: qaca.predict_proba(l, q)),
    ]:
        probs   = get_probs(clean_logits, clean_quality)
        metrics = compute_all(probs, clean_labels, clean_quality)
        metrics.update({'corruption': 'clean', 'severity': 0, 'method': method})
        results.append(metrics)
        print(f"clean / {method}: ECE={metrics['ece']:.4f}  AURC={metrics['aurc']:.4f}")

    # Corrupted
    for name in CORRUPTION_NAMES:
        for sev in SEVERITIES:
            logits_path = in_dir / f'{name}_s{sev}_logits.npy'
            if not logits_path.exists():
                print(f"Missing: {logits_path} — run run_benchmark.py first")
                continue
            logits = np.load(logits_path)
            labels = np.load(in_dir / 'clean_labels.npy')   # same test split

            ds = CorruptedDataset(test_ds_raw, name, sev, test_transform)
            brisque_raw = _collect_brisque_raw_from_ds(ds)
            quality     = normalizer.transform(brisque_raw)

            for method, get_probs in [
                ('uncalibrated', lambda l, q: softmax_np(l)),
                ('temperature',  lambda l, q: softmax_np(l / qaca.T_base)),
                ('qaca',         lambda l, q: qaca.predict_proba(l, q)),
            ]:
                probs   = get_probs(logits, quality)
                metrics = compute_all(probs, labels, quality)
                metrics.update({'corruption': name, 'severity': sev, 'method': method})
                results.append(metrics)

            print(f"{name}-{sev}: qaca ECE={results[-1]['ece']:.4f}  "
                  f"temp ECE={results[-3]['ece']:.4f}")

    with open(out_dir / 'qaca_results.json', 'w') as f:
        json.dump(results, f, indent=2, default=_json_safe)
    print(f"\nSaved {len(results)} rows → {out_dir}/qaca_results.json")


def _collect_brisque_raw(ds, transform) -> np.ndarray:
    from tqdm import tqdm
    scores = []
    for i in tqdm(range(len(ds)), desc='BRISQUE', leave=False):
        img, _ = ds[i]
        arr = denormalize_to_uint8(img)
        scores.append(compute_brisque(arr))
    return np.array(scores, dtype=np.float32)


def _collect_brisque_raw_from_ds(ds) -> np.ndarray:
    from tqdm import tqdm
    scores = []
    for i in tqdm(range(len(ds)), desc='BRISQUE', leave=False):
        img, _ = ds[i]
        arr = denormalize_to_uint8(img)
        scores.append(compute_brisque(arr))
    return np.array(scores, dtype=np.float32)


def _json_safe(obj):
    if isinstance(obj, (np.float32, np.float64)):
        return float(obj)
    if isinstance(obj, (np.int32, np.int64)):
        return int(obj)
    if obj != obj:
        return None
    raise TypeError(type(obj))


if __name__ == '__main__':
    main()
