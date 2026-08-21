from dataclasses import dataclass

import numpy as np


def _softmax(x: np.ndarray) -> np.ndarray:
    x = x - x.max(1, keepdims=True)
    exp = np.exp(x)
    return exp / exp.sum(1, keepdims=True)


def kd_loss(
    student: np.ndarray, teacher: np.ndarray, temperature: float = 2.0
) -> float:
    if student.shape != teacher.shape:
        raise ValueError("logits must share shape")
    p, q = _softmax(teacher / temperature), _softmax(student / temperature)
    return float(-(p * np.log(np.clip(q, 1e-12, 1))).sum(1).mean() * temperature**2)


def feature_alignment_loss(client_features: list[np.ndarray]) -> float:
    if len(client_features) < 2:
        return 0.0
    shape = client_features[0].shape
    if any(x.shape != shape for x in client_features):
        raise ValueError("project features to a shared shape first")
    center = np.mean(client_features, axis=0)
    return float(np.mean([np.mean((x - center) ** 2) for x in client_features]))


def communication_bytes(
    reference_logits: np.ndarray, projected_features: np.ndarray
) -> int:
    return reference_logits.nbytes + projected_features.nbytes


@dataclass(frozen=True)
class Schedule:
    alpha: float = 1.0
    beta: float = 0.5
    decay: float = 1.0

    def at(self, round_index: int) -> tuple[float, float]:
        if round_index < 0:
            raise ValueError("round_index must be non-negative")
        factor = self.decay**round_index
        return self.alpha * factor, self.beta * factor
