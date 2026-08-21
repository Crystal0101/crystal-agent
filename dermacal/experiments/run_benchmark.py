"""
Benchmark one model across all 19 evaluation conditions (1 clean + 18 corruptions).
Usage:
  python run_benchmark.py --model resnet50 --ckpt results/baseline/resnet50/best.pt
"""
import argparse
import json
import numpy as np
from pathlib import Path

import torch

from src.dataset import load_splits, get_loader, get_transforms, HAM10000Dataset
from src.models import build_model, get_device, load_checkpoint
from src.corrupt import CORRUPTION_NAMES, SEVERITIES
from src.evaluate import evaluate_clean, evaluate_condition, softmax_np, collect_logits
from src.qaca import BRISQUENormalizer


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument('--model',       required=True)
    p.add_argument('--ckpt',        required=True)
    p.add_argument('--data_root',   default='data/HAM10000')
    p.add_argument('--batch_size',  type=int, default=64)
    p.add_argument('--seed',        type=int, default=42)
    p.add_argument('--out_dir',     default='results/corrupted')
    p.add_argument('--no_brisque',  action='store_true',
                   help='Skip BRISQUE computation (faster, no QS-ECE)')
    return p.parse_args()


def main():
    args = parse_args()
    device = get_device()
    print(f"Device: {device}  |  Model: {args.model}")

    # Load data
    _, val_ds, test_ds, _ = load_splits(args.data_root, seed=args.seed)
    test_loader = get_loader(test_ds, args.batch_size, shuffle=False)
    test_transform = get_transforms('test')

    # Raw (transform=None) views for the corruption pipeline: CorruptedDataset
    # must receive un-normalized PIL images, not already-normalized tensors.
    # (Bug fix: previously test_ds/val_ds — which already apply Normalize() —
    # were passed directly, and CorruptedDataset's tensor->PIL fallback
    # treated the normalized tensor as if it were a raw [0,1] image before
    # multiplying by 255, producing garbled images before corruption.)
    val_ds_raw  = HAM10000Dataset(val_ds.df,  val_ds.img_dirs,  transform=None)
    test_ds_raw = HAM10000Dataset(test_ds.df, test_ds.img_dirs, transform=None)

    # Load model
    model = build_model(args.model).to(device)
    load_checkpoint(model, args.ckpt, device)

    # Fit BRISQUE normalizer on validation clean images (for QS-ECE)
    normalizer = None
    if not args.no_brisque:
        print("Fitting BRISQUE normalizer on val set (clean)...")
        normalizer = _fit_normalizer_on_val(val_ds_raw, test_transform)

    out_dir = Path(args.out_dir) / args.model
    out_dir.mkdir(parents=True, exist_ok=True)

    results = []

    # ── 1. Clean ────────────────────────────────────────────────────────────────
    print("Evaluating: clean")
    metrics, logits, labels = evaluate_clean(model, test_loader, device)
    np.save(out_dir / 'clean_logits.npy', logits)
    np.save(out_dir / 'clean_labels.npy', labels)
    results.append(metrics)
    print(f"  ECE={metrics['ece']:.4f}  Acc={metrics['accuracy']:.4f}  "
          f"AURC={metrics['aurc']:.4f}")

    # ── 2. Corrupted conditions ─────────────────────────────────────────────────
    for name in CORRUPTION_NAMES:
        for sev in SEVERITIES:
            label = f"{name}-{sev}"
            print(f"Evaluating: {label}")

            metrics, logits, labels = evaluate_condition(
                model, test_ds_raw, test_transform, name, sev,
                device, args.batch_size, num_workers=4,
                brisque_normalizer=normalizer,
            )
            np.save(out_dir / f'{name}_s{sev}_logits.npy', logits)
            results.append(metrics)
            print(f"  ECE={metrics['ece']:.4f}  Acc={metrics['accuracy']:.4f}  "
                  f"AURC={metrics['aurc']:.4f}")

    # Save all results
    with open(out_dir / 'benchmark_results.json', 'w') as f:
        json.dump(results, f, indent=2, default=_json_safe)
    print(f"\nSaved {len(results)} conditions to {out_dir}/benchmark_results.json")


def _fit_normalizer_on_val(val_ds, transform) -> BRISQUENormalizer:
    from src.qaca import compute_brisque
    from src.evaluate import _compute_brisque_batch, CorruptedDataset
    from tqdm import tqdm
    import numpy as np

    class _RawDS(torch.utils.data.Dataset):
        def __init__(self, ds, tf): self.ds, self.tf = ds, tf
        def __len__(self): return len(self.ds)
        def __getitem__(self, i):
            from PIL import Image
            img, lbl = self.ds[i]
            if isinstance(img, torch.Tensor):
                arr = (img.permute(1,2,0).numpy()*255).astype('uint8')
                img = Image.fromarray(arr)
            return img, lbl

    raw_ds = _RawDS(val_ds, transform)
    scores = []
    for i in tqdm(range(len(raw_ds)), desc='BRISQUE val', leave=False):
        img, _ = raw_ds[i]
        arr = np.array(img)
        scores.append(compute_brisque(arr))

    norm = BRISQUENormalizer()
    norm.fit(np.array(scores, dtype=np.float32))
    return norm


def _json_safe(obj):
    if isinstance(obj, (np.float32, np.float64)):
        return float(obj)
    if isinstance(obj, (np.int32, np.int64)):
        return int(obj)
    if obj != obj:           # nan
        return None
    raise TypeError(f"Not JSON serializable: {type(obj)}")


if __name__ == '__main__':
    main()
