"""Split-conformal prediction sets with optional quality Mondrian strata.

The implementation deliberately keeps fitting and prediction separate:
``fit`` consumes calibration labels; ``predict_sets`` never accepts labels.
This API makes accidental test-label tuning harder.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

import numpy as np


def _validate_probs(probs: np.ndarray) -> np.ndarray:
    probs = np.asarray(probs, dtype=np.float64)
    if probs.ndim != 2 or probs.shape[0] == 0 or probs.shape[1] < 2:
        raise ValueError("probs must have shape (n_samples, n_classes), n_classes >= 2")
    if not np.isfinite(probs).all() or (probs < 0).any():
        raise ValueError("probs must be finite and non-negative")
    row_sums = probs.sum(axis=1)
    if not np.allclose(row_sums, 1.0, atol=1e-6):
        raise ValueError("each probability row must sum to one")
    return probs


def conformal_quantile(scores: np.ndarray, alpha: float) -> float:
    """Finite-sample split-conformal quantile using the 'higher' order statistic.

    The selected order statistic is ``ceil((n + 1) * (1 - alpha))``, clipped
    to ``n`` and converted from one-based to zero-based indexing.
    """
    scores = np.asarray(scores, dtype=np.float64).reshape(-1)
    if scores.size == 0 or not np.isfinite(scores).all():
        raise ValueError("scores must be a non-empty finite array")
    if not 0.0 < alpha < 1.0:
        raise ValueError("alpha must lie strictly between zero and one")
    k = min(scores.size, int(np.ceil((scores.size + 1) * (1.0 - alpha))))
    return float(np.partition(scores, k - 1)[k - 1])


def quality_bin_ids(quality: np.ndarray, edges: np.ndarray) -> np.ndarray:
    quality = np.asarray(quality, dtype=np.float64).reshape(-1)
    edges = np.asarray(edges, dtype=np.float64).reshape(-1)
    if not np.isfinite(quality).all() or not np.isfinite(edges).all():
        raise ValueError("quality and edges must be finite")
    if edges.size and np.any(np.diff(edges) <= 0):
        raise ValueError("quality edges must be strictly increasing")
    return np.digitize(quality, edges, right=False)


@dataclass(frozen=True)
class FitSummary:
    alpha: float
    pooled_threshold: float
    quality_edges: tuple[float, ...]
    stratum_thresholds: dict[int, float]
    stratum_sizes: dict[int, int]
    fallback_strata: tuple[int, ...]


class QualityMondrianConformal:
    """APS-free class-probability conformal sets stratified by image quality.

    Nonconformity is ``1 - p_true``.  A label is included when
    ``1 - p_label <= q_hat``. Quality edges are learned only from calibration
    quality values (unless explicitly provided a priori).
    """

    def __init__(self, alpha: float = 0.10, n_quality_bins: int = 3,
                 min_bin_size: int = 30, quality_edges: Iterable[float] | None = None):
        if not 0.0 < alpha < 1.0:
            raise ValueError("alpha must lie strictly between zero and one")
        if n_quality_bins < 1:
            raise ValueError("n_quality_bins must be positive")
        if min_bin_size < 1:
            raise ValueError("min_bin_size must be positive")
        self.alpha = float(alpha)
        self.n_quality_bins = int(n_quality_bins)
        self.min_bin_size = int(min_bin_size)
        self._provided_edges = None if quality_edges is None else np.asarray(tuple(quality_edges), dtype=float)
        self.summary_: FitSummary | None = None

    def fit(self, probs: np.ndarray, labels: np.ndarray,
            quality: np.ndarray) -> "QualityMondrianConformal":
        probs = _validate_probs(probs)
        labels = np.asarray(labels, dtype=np.int64).reshape(-1)
        quality = np.asarray(quality, dtype=np.float64).reshape(-1)
        n, n_classes = probs.shape
        if labels.size != n or quality.size != n:
            raise ValueError("probs, labels and quality must have equal sample counts")
        if (labels < 0).any() or (labels >= n_classes).any():
            raise ValueError("labels contain an invalid class index")
        if not np.isfinite(quality).all():
            raise ValueError("quality must be finite")

        scores = 1.0 - probs[np.arange(n), labels]
        pooled = conformal_quantile(scores, self.alpha)

        if self._provided_edges is not None:
            edges = self._provided_edges.copy()
        elif self.n_quality_bins == 1:
            edges = np.array([], dtype=float)
        else:
            qs = np.linspace(0, 1, self.n_quality_bins + 1)[1:-1]
            edges = np.unique(np.quantile(quality, qs))

        ids = quality_bin_ids(quality, edges)
        thresholds: dict[int, float] = {}
        sizes: dict[int, int] = {}
        fallback: list[int] = []
        for stratum in range(len(edges) + 1):
            mask = ids == stratum
            sizes[stratum] = int(mask.sum())
            if sizes[stratum] < self.min_bin_size:
                thresholds[stratum] = pooled
                fallback.append(stratum)
            else:
                thresholds[stratum] = conformal_quantile(scores[mask], self.alpha)

        self.summary_ = FitSummary(
            alpha=self.alpha,
            pooled_threshold=pooled,
            quality_edges=tuple(float(x) for x in edges),
            stratum_thresholds=thresholds,
            stratum_sizes=sizes,
            fallback_strata=tuple(fallback),
        )
        return self

    def predict_sets(self, probs: np.ndarray, quality: np.ndarray) -> np.ndarray:
        if self.summary_ is None:
            raise RuntimeError("call fit before predict_sets")
        probs = _validate_probs(probs)
        quality = np.asarray(quality, dtype=np.float64).reshape(-1)
        if quality.size != probs.shape[0] or not np.isfinite(quality).all():
            raise ValueError("quality must be finite and match probs sample count")
        edges = np.asarray(self.summary_.quality_edges, dtype=float)
        ids = quality_bin_ids(quality, edges)
        thresholds = np.array([self.summary_.stratum_thresholds[int(i)] for i in ids])
        return (1.0 - probs) <= thresholds[:, None]


def adaptive_score_matrix(probs: np.ndarray, penalty: float = 0.0,
                          regularization_rank: int = 0) -> np.ndarray:
    """Return deterministic APS/RAPS nonconformity scores for every label.

    APS is obtained with ``penalty=0``. RAPS adds ``penalty`` for each rank
    beyond ``regularization_rank``. Ties are resolved by stable class order;
    randomized APS is deliberately excluded so all seeds remain reproducible.
    """
    probs = _validate_probs(probs)
    if penalty < 0 or regularization_rank < 0:
        raise ValueError("penalty and regularization_rank must be non-negative")
    order = np.argsort(-probs, axis=1, kind="stable")
    sorted_probs = np.take_along_axis(probs, order, axis=1)
    cumulative = np.cumsum(sorted_probs, axis=1)
    ranks = np.arange(1, probs.shape[1] + 1)
    sorted_scores = cumulative + penalty * np.maximum(ranks - regularization_rank, 0)
    scores = np.empty_like(sorted_scores)
    np.put_along_axis(scores, order, sorted_scores, axis=1)
    return scores


class AdaptiveQualityMondrianConformal:
    """Pooled or quality-Mondrian deterministic APS/RAPS prediction sets."""

    def __init__(self, alpha=0.1, n_quality_bins=1, min_bin_size=30,
                 penalty=0.0, regularization_rank=0, quality_edges=None):
        self.alpha = float(alpha)
        self.n_quality_bins = int(n_quality_bins)
        self.min_bin_size = int(min_bin_size)
        self.penalty = float(penalty)
        self.regularization_rank = int(regularization_rank)
        self._provided_edges = quality_edges
        self.summary_ = None
        # Reuse argument validation and summary semantics of the base method.
        QualityMondrianConformal(alpha, n_quality_bins, min_bin_size, quality_edges)

    def fit(self, probs, labels, quality):
        probs = _validate_probs(probs)
        labels = np.asarray(labels, dtype=np.int64).reshape(-1)
        quality = np.asarray(quality, dtype=float).reshape(-1)
        if len(labels) != len(probs) or len(quality) != len(probs):
            raise ValueError("probs, labels and quality must have equal sample counts")
        matrix = adaptive_score_matrix(
            probs, self.penalty, self.regularization_rank)
        if (labels < 0).any() or (labels >= probs.shape[1]).any():
            raise ValueError("labels contain an invalid class index")
        true_scores = matrix[np.arange(len(labels)), labels]
        pooled = conformal_quantile(true_scores, self.alpha)
        if self._provided_edges is not None:
            edges = np.asarray(tuple(self._provided_edges), dtype=float)
        elif self.n_quality_bins == 1:
            edges = np.array([], dtype=float)
        else:
            edges = np.unique(np.quantile(
                quality, np.linspace(0, 1, self.n_quality_bins + 1)[1:-1]))
        ids = quality_bin_ids(quality, edges)
        thresholds, sizes, fallback = {}, {}, []
        for stratum in range(len(edges) + 1):
            mask = ids == stratum
            sizes[stratum] = int(mask.sum())
            if sizes[stratum] < self.min_bin_size:
                thresholds[stratum] = pooled
                fallback.append(stratum)
            else:
                thresholds[stratum] = conformal_quantile(
                    true_scores[mask], self.alpha)
        self.summary_ = FitSummary(
            self.alpha, pooled, tuple(float(x) for x in edges), thresholds,
            sizes, tuple(fallback))
        return self

    def predict_sets(self, probs, quality):
        if self.summary_ is None:
            raise RuntimeError("call fit before predict_sets")
        probs = _validate_probs(probs)
        quality = np.asarray(quality, dtype=float).reshape(-1)
        if len(quality) != len(probs) or not np.isfinite(quality).all():
            raise ValueError("quality must be finite and match probs sample count")
        ids = quality_bin_ids(quality, np.asarray(self.summary_.quality_edges))
        thresholds = np.asarray([
            self.summary_.stratum_thresholds[int(i)] for i in ids])
        return adaptive_score_matrix(
            probs, self.penalty, self.regularization_rank) <= thresholds[:, None]


class ClassConditionalConformal:
    """LAC with a candidate-specific threshold calibrated by true class."""

    def __init__(self, alpha=0.1, min_class_size=30):
        self.alpha = float(alpha)
        self.min_class_size = int(min_class_size)
        self.thresholds_ = None
        self.class_sizes_ = None

    def fit(self, probs, labels):
        probs = _validate_probs(probs)
        labels = np.asarray(labels, dtype=np.int64).reshape(-1)
        if len(labels) != len(probs) or (labels < 0).any() or \
                (labels >= probs.shape[1]).any():
            raise ValueError("labels must match probs and contain valid classes")
        scores = 1.0 - probs[np.arange(len(labels)), labels]
        pooled = conformal_quantile(scores, self.alpha)
        thresholds, sizes = [], []
        for label in range(probs.shape[1]):
            mask = labels == label
            sizes.append(int(mask.sum()))
            thresholds.append(conformal_quantile(scores[mask], self.alpha)
                              if mask.sum() >= self.min_class_size else pooled)
        self.thresholds_ = np.asarray(thresholds)
        self.class_sizes_ = sizes
        return self

    def predict_sets(self, probs):
        if self.thresholds_ is None:
            raise RuntimeError("call fit before predict_sets")
        probs = _validate_probs(probs)
        if probs.shape[1] != len(self.thresholds_):
            raise ValueError("class count differs from calibration")
        return (1.0 - probs) <= self.thresholds_[None, :]


class QualityNormalizedConformal:
    """Exploratory quality-normalised split conformal with a three-way split.

    One subset learns a monotone quality→expected-nonconformity scale. A disjoint
    subset calibrates the normalised score. This separation preserves ordinary
    split-conformal marginal validity conditional on the fitted score function.
    """

    def __init__(self, alpha: float = 0.10, score_fit_fraction: float = 0.5,
                 seed: int = 0, min_scale: float = 1e-3):
        if not 0.0 < alpha < 1.0:
            raise ValueError("alpha must lie strictly between zero and one")
        if not 0.1 <= score_fit_fraction <= 0.8:
            raise ValueError("score_fit_fraction must lie in [0.1, 0.8]")
        self.alpha = alpha
        self.score_fit_fraction = score_fit_fraction
        self.seed = seed
        self.min_scale = min_scale
        self.scale_model_ = None
        self.threshold_ = None
        self.split_indices_ = None

    def fit(self, probs: np.ndarray, labels: np.ndarray,
            quality: np.ndarray) -> "QualityNormalizedConformal":
        from sklearn.isotonic import IsotonicRegression

        probs = _validate_probs(probs)
        labels = np.asarray(labels, dtype=np.int64).reshape(-1)
        quality = np.asarray(quality, dtype=np.float64).reshape(-1)
        n = len(labels)
        if probs.shape[0] != n or quality.size != n:
            raise ValueError("probs, labels and quality must have equal sample counts")
        if (labels < 0).any() or (labels >= probs.shape[1]).any():
            raise ValueError("labels contain an invalid class index")
        rng = np.random.default_rng(self.seed)
        order = rng.permutation(n)
        cut = int(round(n * self.score_fit_fraction))
        fit_idx, conformal_idx = order[:cut], order[cut:]
        if len(fit_idx) < 20 or len(conformal_idx) < 20:
            raise ValueError("calibration sample is too small for the three-way split")
        raw = 1.0 - probs[np.arange(n), labels]
        model = IsotonicRegression(increasing=False, out_of_bounds="clip")
        model.fit(quality[fit_idx], raw[fit_idx])
        scale = np.maximum(model.predict(quality[conformal_idx]), self.min_scale)
        self.threshold_ = conformal_quantile(raw[conformal_idx] / scale, self.alpha)
        self.scale_model_ = model
        self.split_indices_ = {
            "score_fit": fit_idx.copy(), "conformal": conformal_idx.copy()}
        return self

    def predict_sets(self, probs: np.ndarray, quality: np.ndarray) -> np.ndarray:
        if self.scale_model_ is None or self.threshold_ is None:
            raise RuntimeError("call fit before predict_sets")
        probs = _validate_probs(probs)
        quality = np.asarray(quality, dtype=np.float64).reshape(-1)
        if quality.size != probs.shape[0] or not np.isfinite(quality).all():
            raise ValueError("quality must be finite and match probs sample count")
        scale = np.maximum(self.scale_model_.predict(quality), self.min_scale)
        return ((1.0 - probs) / scale[:, None]) <= self.threshold_


def prediction_set_metrics(prediction_sets: np.ndarray, labels: np.ndarray,
                           point_predictions: np.ndarray | None = None) -> dict[str, float]:
    sets = np.asarray(prediction_sets, dtype=bool)
    labels = np.asarray(labels, dtype=np.int64).reshape(-1)
    if sets.ndim != 2 or sets.shape[0] != labels.size:
        raise ValueError("prediction_sets and labels have incompatible shapes")
    if (labels < 0).any() or (labels >= sets.shape[1]).any():
        raise ValueError("labels contain an invalid class index")
    sizes = sets.sum(axis=1)
    covered = sets[np.arange(labels.size), labels]
    singleton = sizes == 1
    out = {
        "n": int(labels.size),
        "coverage": float(covered.mean()),
        "average_set_size": float(sizes.mean()),
        "singleton_fraction": float(singleton.mean()),
        "empty_fraction": float((sizes == 0).mean()),
    }
    if singleton.any():
        singleton_pred = sets[singleton].argmax(axis=1)
        out["singleton_selective_risk"] = float((singleton_pred != labels[singleton]).mean())
    else:
        out["singleton_selective_risk"] = float("nan")
    if point_predictions is not None:
        pred = np.asarray(point_predictions, dtype=np.int64).reshape(-1)
        if pred.size != labels.size:
            raise ValueError("point_predictions must match labels")
        out["point_error"] = float((pred != labels).mean())
    return out
