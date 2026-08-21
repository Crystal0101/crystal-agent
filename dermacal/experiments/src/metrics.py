"""
Calibration and robustness metrics:
ECE, MCE, NLL, Brier Score, AURC, Quality-Stratified ECE.
"""
import numpy as np
import torch
import torch.nn.functional as F
from typing import Optional


def _to_numpy(x):
    if isinstance(x, torch.Tensor):
        return x.detach().cpu().numpy()
    return np.array(x)


# ── ECE / MCE ──────────────────────────────────────────────────────────────────
def ece_mce(probs: np.ndarray, labels: np.ndarray, n_bins: int = 15):
    """
    probs : (N, C) softmax probabilities
    labels: (N,)  integer class labels
    Returns: ece (float), mce (float)
    """
    confidences = probs.max(axis=1)          # (N,)
    predictions = probs.argmax(axis=1)       # (N,)
    correct     = (predictions == labels).astype(float)

    bins = np.linspace(0, 1, n_bins + 1)
    ece = 0.0
    mce = 0.0
    n   = len(labels)

    for lo, hi in zip(bins[:-1], bins[1:]):
        mask = (confidences > lo) & (confidences <= hi)
        if mask.sum() == 0:
            continue
        acc  = correct[mask].mean()
        conf = confidences[mask].mean()
        gap  = abs(acc - conf)
        ece += (mask.sum() / n) * gap
        mce  = max(mce, gap)

    return float(ece), float(mce)


# ── NLL ────────────────────────────────────────────────────────────────────────
def nll(probs: np.ndarray, labels: np.ndarray, eps: float = 1e-12) -> float:
    p_true = probs[np.arange(len(labels)), labels]
    return float(-np.log(np.clip(p_true, eps, 1.0)).mean())


# ── Brier Score ────────────────────────────────────────────────────────────────
def brier_score(probs: np.ndarray, labels: np.ndarray) -> float:
    n, c = probs.shape
    onehot = np.zeros_like(probs)
    onehot[np.arange(n), labels] = 1.0
    return float(((probs - onehot) ** 2).sum(axis=1).mean())


# ── AURC ───────────────────────────────────────────────────────────────────────
def aurc(probs: np.ndarray, labels: np.ndarray) -> float:
    """
    Area Under Risk-Coverage curve.
    Sort by descending confidence; compute cumulative error rate.
    """
    confidences = probs.max(axis=1)
    predictions = probs.argmax(axis=1)
    correct     = (predictions == labels).astype(float)

    order  = np.argsort(-confidences)        # highest confidence first
    correct_sorted = correct[order]

    n = len(labels)
    risk_at_coverage = []
    for k in range(1, n + 1):
        error_rate = 1.0 - correct_sorted[:k].mean()
        risk_at_coverage.append(error_rate)

    # Trapezoidal integration over coverage ∈ [1/n, 1]
    return float(np.mean(risk_at_coverage))


# ── Accuracy, Macro-F1, AUROC ──────────────────────────────────────────────────
def accuracy(probs: np.ndarray, labels: np.ndarray) -> float:
    return float((probs.argmax(axis=1) == labels).mean())


def macro_f1(probs: np.ndarray, labels: np.ndarray) -> float:
    from sklearn.metrics import f1_score
    preds = probs.argmax(axis=1)
    return float(f1_score(labels, preds, average='macro', zero_division=0))


def auroc_macro(probs: np.ndarray, labels: np.ndarray) -> float:
    from sklearn.metrics import roc_auc_score
    try:
        return float(roc_auc_score(labels, probs, multi_class='ovr', average='macro'))
    except ValueError:
        return float('nan')


# ── Quality-Stratified ECE ────────────────────────────────────────────────────
def quality_stratified_ece(
    probs: np.ndarray,
    labels: np.ndarray,
    quality_scores: np.ndarray,
    thresholds: tuple = (0.3, 0.7),
    n_bins: int = 15,
) -> dict:
    """
    Split samples into high/mid/low quality bins, compute ECE per bin.
    Returns {'high': ece, 'mid': ece, 'low': ece, 'counts': {...}}
    """
    lo, hi = thresholds
    masks = {
        'high': quality_scores > hi,
        'mid':  (quality_scores >= lo) & (quality_scores <= hi),
        'low':  quality_scores < lo,
    }
    result = {}
    for name, mask in masks.items():
        if mask.sum() < 10:
            result[name] = float('nan')
        else:
            result[name], _ = ece_mce(probs[mask], labels[mask], n_bins)
        result[f'n_{name}'] = int(mask.sum())
    return result


# ── Full metric bundle ─────────────────────────────────────────────────────────
def compute_all(
    probs: np.ndarray,
    labels: np.ndarray,
    quality_scores: Optional[np.ndarray] = None,
    n_bins: int = 15,
) -> dict:
    ece_val, mce_val = ece_mce(probs, labels, n_bins)
    metrics = {
        'accuracy':    accuracy(probs, labels),
        'macro_f1':    macro_f1(probs, labels),
        'auroc':       auroc_macro(probs, labels),
        'ece':         ece_val,
        'mce':         mce_val,
        'nll':         nll(probs, labels),
        'brier':       brier_score(probs, labels),
        'aurc':        aurc(probs, labels),
    }
    if quality_scores is not None:
        qs = quality_stratified_ece(probs, labels, quality_scores, n_bins=n_bins)
        metrics['qs_ece_high'] = qs['high']
        metrics['qs_ece_mid']  = qs['mid']
        metrics['qs_ece_low']  = qs['low']
    return metrics
