from __future__ import annotations

from dataclasses import dataclass
from itertools import pairwise

import numpy as np


def softmax(logits: np.ndarray, temperature: np.ndarray | float = 1.0) -> np.ndarray:
    scaled = logits / np.asarray(temperature)[..., None]
    scaled -= scaled.max(axis=1, keepdims=True)
    exp = np.exp(scaled)
    return exp / exp.sum(axis=1, keepdims=True)


def expected_calibration_error(
    probabilities: np.ndarray, labels: np.ndarray, bins: int = 15
) -> float:
    confidence, prediction = probabilities.max(1), probabilities.argmax(1)
    edges, score = np.linspace(0, 1, bins + 1), 0.0
    for lower, upper in pairwise(edges):
        mask = (confidence > lower) & (confidence <= upper)
        if mask.any():
            score += mask.mean() * abs(
                (prediction[mask] == labels[mask]).mean() - confidence[mask].mean()
            )
    return float(score)


def brier_score(probabilities: np.ndarray, labels: np.ndarray) -> float:
    target = np.eye(probabilities.shape[1])[labels]
    return float(np.mean(np.sum((probabilities - target) ** 2, axis=1)))


@dataclass(frozen=True)
class QACA:
    base_temperature: float = 1.0
    alpha: float = 1.0

    def temperatures(self, quality: np.ndarray) -> np.ndarray:
        if np.any((quality < 0) | (quality > 1)):
            raise ValueError("quality must be normalized to [0, 1]")
        return np.maximum(0.05, self.base_temperature + self.alpha * (1.0 - quality))

    def transform(self, logits: np.ndarray, quality: np.ndarray) -> np.ndarray:
        return softmax(logits, self.temperatures(quality))

    @classmethod
    def fit(cls, logits: np.ndarray, labels: np.ndarray, quality: np.ndarray) -> QACA:
        candidates = (
            cls(base, alpha)
            for base in np.linspace(0.5, 3, 11)
            for alpha in np.linspace(0, 3, 13)
        )
        return min(
            candidates,
            key=lambda model: brier_score(model.transform(logits, quality), labels),
        )
