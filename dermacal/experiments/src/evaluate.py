"""
Evaluation pipeline: collect logits + labels for one condition,
compute and return full metric dict.
"""
import numpy as np
import torch
import torch.nn.functional as F
from torch.utils.data import DataLoader, Dataset
from PIL import Image
from pathlib import Path
from tqdm import tqdm

from .corrupt import apply_corruption
from .metrics import compute_all
from .qaca import compute_brisque, BRISQUENormalizer
from .dataset import denormalize_to_uint8


class CorruptedDataset(Dataset):
    """Wraps a base dataset and applies a corruption on-the-fly."""

    def __init__(self, base_ds, corruption_name: str, severity: int, base_transform=None):
        self.base_ds = base_ds
        self.corruption_name = corruption_name
        self.severity = severity
        self.base_transform = base_transform

    def __len__(self):
        return len(self.base_ds)

    def __getitem__(self, idx):
        # base_ds should return (PIL.Image, label) when transform is None
        img, label = self.base_ds[idx]
        if isinstance(img, torch.Tensor):
            # Defensive fallback: base_ds is expected to have transform=None
            # (see run_benchmark.py / run_qaca.py raw dataset views). If a
            # normalized tensor slips through anyway, invert Normalize()
            # properly instead of naively doing (tensor*255).astype(uint8),
            # which wraps/garbles an already mean/std-normalized tensor.
            img = Image.fromarray(denormalize_to_uint8(img))
        img = apply_corruption(img, self.corruption_name, self.severity)
        if self.base_transform:
            img = self.base_transform(img)
        return img, label


@torch.no_grad()
def collect_logits(
    model: torch.nn.Module,
    loader: DataLoader,
    device: torch.device,
) -> tuple[np.ndarray, np.ndarray]:
    """Returns (logits, labels) as numpy arrays."""
    model.eval()
    all_logits, all_labels = [], []
    for imgs, labels in tqdm(loader, desc='Collecting', leave=False):
        imgs = imgs.to(device, non_blocking=True)
        logits = model(imgs)
        all_logits.append(logits.cpu().numpy())
        all_labels.append(labels.numpy())
    return np.concatenate(all_logits), np.concatenate(all_labels)


def softmax_np(logits: np.ndarray) -> np.ndarray:
    shifted = logits - logits.max(axis=1, keepdims=True)
    exp = np.exp(shifted)
    return exp / exp.sum(axis=1, keepdims=True)


def evaluate_condition(
    model: torch.nn.Module,
    base_ds,
    base_transform,
    corruption_name: str,
    severity: int,
    device: torch.device,
    batch_size: int = 64,
    num_workers: int = 4,
    brisque_normalizer: BRISQUENormalizer | None = None,
) -> dict:
    """
    Evaluate one model on one (corruption, severity) condition.
    Returns metric dict.
    """
    from .dataset import HAM10000Dataset

    ds = CorruptedDataset(base_ds, corruption_name, severity, base_transform)
    loader = DataLoader(ds, batch_size=batch_size, shuffle=False,
                        num_workers=num_workers, pin_memory=True)

    logits, labels = collect_logits(model, loader, device)
    probs = softmax_np(logits)

    quality_scores = None
    if brisque_normalizer is not None:
        # Compute BRISQUE for each sample (slow — done once, cached in run_benchmark)
        raw_scores = _compute_brisque_batch(ds)
        quality_scores = brisque_normalizer.transform(raw_scores)

    metrics = compute_all(probs, labels, quality_scores)
    metrics['corruption'] = corruption_name
    metrics['severity']   = severity
    return metrics, logits, labels


def _compute_brisque_batch(ds) -> np.ndarray:
    scores = []
    for i in tqdm(range(len(ds)), desc='BRISQUE', leave=False):
        img, _ = ds[i]
        arr = denormalize_to_uint8(img)
        scores.append(compute_brisque(arr))
    return np.array(scores, dtype=np.float32)


def evaluate_clean(
    model: torch.nn.Module,
    loader: DataLoader,
    device: torch.device,
    brisque_normalizer: BRISQUENormalizer | None = None,
) -> tuple[dict, np.ndarray, np.ndarray]:
    logits, labels = collect_logits(model, loader, device)
    probs  = softmax_np(logits)
    metrics = compute_all(probs, labels)
    metrics['corruption'] = 'clean'
    metrics['severity']   = 0
    return metrics, logits, labels
