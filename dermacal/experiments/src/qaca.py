"""
Quality-Aware Confidence Adjustment (QACA) module.
Steps:
  1. Robust BRISQUE normalization (percentile-based)
  2. Adaptive temperature: T(x) = clip(T_base + alpha*(1-Q(x)), T_min, T_max)
  3. Calibrated softmax output
"""
import numpy as np
import torch
import torch.nn.functional as F
from scipy.optimize import minimize_scalar, minimize
from typing import Optional


# ── BRISQUE quality score ──────────────────────────────────────────────────────
def compute_brisque(img_np: np.ndarray) -> float:
    """
    img_np: HxWx3 uint8 numpy array (RGB).
    Returns raw BRISQUE score (lower = better quality, typically 0-100).
    Requires piq or scikit-image.
    """
    try:
        import piq
        import torch
        t = torch.from_numpy(img_np).permute(2, 0, 1).unsqueeze(0).float() / 255.0
        return float(piq.brisque(t, data_range=1.0))
    except ImportError:
        pass
    try:
        from skimage.restoration import estimate_sigma
        # fallback: use noise estimation as quality proxy
        gray = img_np.mean(axis=2)
        sigma = estimate_sigma(gray)
        return float(min(sigma * 100, 100))
    except Exception:
        return 50.0   # neutral fallback


class BRISQUENormalizer:
    """Fit percentile statistics on a validation set, then normalize scores."""

    def __init__(self, p_low: float = 5.0, p_high: float = 95.0, eps: float = 1e-6):
        self.p_low  = p_low
        self.p_high = p_high
        self.eps    = eps
        self._lo: Optional[float] = None
        self._hi: Optional[float] = None

    def fit(self, raw_scores: np.ndarray):
        self._lo = float(np.percentile(raw_scores, self.p_low))
        self._hi = float(np.percentile(raw_scores, self.p_high))
        return self

    def transform(self, raw_scores: np.ndarray) -> np.ndarray:
        assert self._lo is not None, "Call fit() first."
        denom = max(self._hi - self._lo, self.eps)
        # BRISQUE: higher = worse quality → invert to get Q ∈ [0,1], 1=best
        q = 1.0 - (raw_scores - self._lo) / denom
        return np.clip(q, 0.0, 1.0)

    def fit_transform(self, raw_scores: np.ndarray) -> np.ndarray:
        return self.fit(raw_scores).transform(raw_scores)

    def save(self, path: str):
        np.save(path, np.array([self._lo, self._hi]))

    def load(self, path: str):
        arr = np.load(path)
        self._lo, self._hi = float(arr[0]), float(arr[1])
        return self


# ── Standard Temperature Scaling ──────────────────────────────────────────────
def fit_temperature(logits: np.ndarray, labels: np.ndarray) -> float:
    """Fit a single temperature on (logits, labels) by minimizing NLL."""
    def neg_log_likelihood(log_t):
        T = np.exp(log_t)
        scaled = logits / T
        shifted = scaled - scaled.max(axis=1, keepdims=True)
        log_sum = np.log(np.exp(shifted).sum(axis=1, keepdims=True))
        log_probs = shifted - log_sum
        nll = -log_probs[np.arange(len(labels)), labels].mean()
        return nll

    result = minimize_scalar(neg_log_likelihood, bounds=(-4, 4), method='bounded')
    return float(np.exp(result.x))


def apply_temperature(logits: np.ndarray, T: float) -> np.ndarray:
    scaled  = logits / T
    shifted = scaled - scaled.max(axis=1, keepdims=True)
    exp     = np.exp(shifted)
    return exp / exp.sum(axis=1, keepdims=True)


# ── QACA ──────────────────────────────────────────────────────────────────────
class QACA:
    """
    Quality-Aware Confidence Adjustment.

    T_QACA(x) = clip(T_base + alpha * (1 - Q(x)), T_min, T_max)
    """

    T_MIN: float = 1.0
    T_MAX: float = 15.0
    EXTREME_Q_THRESHOLD: float = 0.05   # images below this → uniform distribution

    def __init__(self):
        self.T_base: Optional[float] = None
        self.alpha:  Optional[float] = None
        self.normalizer = BRISQUENormalizer()

    # ── fitting ────────────────────────────────────────────────────────────────
    def fit_normalizer(self, raw_brisque_scores: np.ndarray):
        """Fit percentile normalizer on validation raw BRISQUE scores."""
        self.normalizer.fit(raw_brisque_scores)
        return self

    def fit(
        self,
        logits_clean: np.ndarray,
        labels_clean: np.ndarray,
        logits_mixed: np.ndarray,
        labels_mixed: np.ndarray,
        quality_scores_mixed: np.ndarray,  # normalized Q ∈ [0,1]
    ):
        """
        Two-stage fitting:
          1. T_base on clean validation logits.
          2. alpha on mixed-quality validation logits (with T_base fixed).
        """
        self.T_base = fit_temperature(logits_clean, labels_clean)
        print(f"T_base = {self.T_base:.4f}")

        def nll_alpha(alpha):
            T_vec = np.clip(
                self.T_base + alpha * (1.0 - quality_scores_mixed),
                self.T_MIN, self.T_MAX,
            )
            scaled  = logits_mixed / T_vec[:, None]
            shifted = scaled - scaled.max(axis=1, keepdims=True)
            log_sum = np.log(np.exp(shifted).sum(axis=1, keepdims=True))
            log_probs = shifted - log_sum
            return -log_probs[np.arange(len(labels_mixed)), labels_mixed].mean()

        result = minimize_scalar(nll_alpha, bounds=(0.0, 20.0), method='bounded')
        self.alpha = float(result.x)
        print(f"alpha  = {self.alpha:.4f}")
        return self

    # ── inference ──────────────────────────────────────────────────────────────
    def temperature(self, quality_scores: np.ndarray) -> np.ndarray:
        assert self.T_base is not None, "Call fit() first."
        T = self.T_base + self.alpha * (1.0 - quality_scores)
        return np.clip(T, self.T_MIN, self.T_MAX)

    def predict_proba(self, logits: np.ndarray, quality_scores: np.ndarray) -> np.ndarray:
        """
        Returns calibrated probability array (N, C).
        Images with Q < EXTREME_Q_THRESHOLD → uniform distribution.
        """
        n, c    = logits.shape
        T_vec   = self.temperature(quality_scores)

        scaled  = logits / T_vec[:, None]
        shifted = scaled - scaled.max(axis=1, keepdims=True)
        exp     = np.exp(shifted)
        probs   = exp / exp.sum(axis=1, keepdims=True)

        # Extreme degradation override
        extreme_mask = quality_scores < self.EXTREME_Q_THRESHOLD
        probs[extreme_mask] = 1.0 / c

        return probs

    # ── persistence ────────────────────────────────────────────────────────────
    def save(self, path: str):
        np.save(path, np.array([self.T_base, self.alpha]))

    def load(self, path: str):
        arr = np.load(path)
        self.T_base, self.alpha = float(arr[0]), float(arr[1])
        return self
