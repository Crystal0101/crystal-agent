from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Iterable

import numpy as np
from numpy.typing import NDArray
from sklearn.datasets import load_breast_cancer  # type: ignore[import-untyped]
from sklearn.metrics import accuracy_score, log_loss, roc_auc_score  # type: ignore[import-untyped]
from sklearn.model_selection import train_test_split  # type: ignore[import-untyped]
from sklearn.preprocessing import StandardScaler  # type: ignore[import-untyped]

Array = NDArray[np.float64]


@dataclass(frozen=True)
class Config:
    clients: int = 5
    rounds: int = 20
    local_epochs: int = 2
    learning_rate: float = 0.05
    epsilon: float | None = 5.0
    clip_norm: float = 1.0
    seed: int = 42
    non_iid_alpha: float = 0.5

    def validate(self) -> None:
        if self.clients < 2 or self.rounds < 1 or self.local_epochs < 1:
            raise ValueError("clients >= 2, rounds >= 1 and local_epochs >= 1 are required")
        if self.learning_rate <= 0 or self.clip_norm <= 0 or self.non_iid_alpha <= 0:
            raise ValueError("learning_rate, clip_norm and non_iid_alpha must be positive")
        if self.epsilon is not None and self.epsilon <= 0:
            raise ValueError("epsilon must be positive or null")


@dataclass
class Model:
    weights: Array
    bias: float = 0.0

    @classmethod
    def zeros(cls, features: int) -> "Model":
        return cls(np.zeros(features, dtype=np.float64))

    def copy(self) -> "Model":
        return Model(self.weights.copy(), self.bias)


def load_data(seed: int = 42) -> tuple[Array, Array, Array, Array]:
    dataset = load_breast_cancer()
    x_train, x_test, y_train, y_test = train_test_split(
        dataset.data, dataset.target, test_size=0.25, stratify=dataset.target, random_state=seed
    )
    scaler = StandardScaler().fit(x_train)
    return (
        scaler.transform(x_train).astype(np.float64),
        y_train.astype(np.float64),
        scaler.transform(x_test).astype(np.float64),
        y_test.astype(np.float64),
    )


def partition_non_iid(x: Array, y: Array, clients: int, alpha: float, seed: int) -> list[tuple[Array, Array]]:
    rng = np.random.default_rng(seed)
    buckets: list[list[int]] = [[] for _ in range(clients)]
    for label in np.unique(y):
        indices = np.flatnonzero(y == label)
        rng.shuffle(indices)
        proportions = rng.dirichlet(np.full(clients, alpha))
        cuts = (np.cumsum(proportions)[:-1] * len(indices)).astype(int)
        for bucket, part in zip(buckets, np.split(indices, cuts), strict=True):
            bucket.extend(part.tolist())
    result = []
    for bucket in buckets:
        if not bucket:
            raise ValueError("empty client partition; increase alpha or reduce clients")
        result.append((x[bucket], y[bucket]))
    return result


def _sigmoid(values: Array) -> Array:
    return 1.0 / (1.0 + np.exp(-np.clip(values, -30, 30)))


def train_local(global_model: Model, x: Array, y: Array, config: Config) -> Model:
    model = global_model.copy()
    for _ in range(config.local_epochs):
        error = _sigmoid(x @ model.weights + model.bias) - y
        model.weights -= config.learning_rate * (x.T @ error / len(x))
        model.bias -= config.learning_rate * float(error.mean())
    return model


def privatize_update(update: Array, clip_norm: float, epsilon: float | None, rng: np.random.Generator) -> Array:
    norm = float(np.linalg.norm(update))
    clipped = update * min(1.0, clip_norm / max(norm, 1e-12))
    if epsilon is None:
        return clipped
    return clipped + rng.laplace(0.0, clip_norm / epsilon, size=clipped.shape)


def aggregate(global_model: Model, local_models: Iterable[tuple[Model, int]], config: Config, rng: np.random.Generator) -> Model:
    models = list(local_models)
    total = sum(size for _, size in models)
    weight_update = np.zeros_like(global_model.weights)
    bias_update = 0.0
    for model, size in models:
        fraction = size / total
        update = np.append(model.weights - global_model.weights, model.bias - global_model.bias)
        private = privatize_update(update, config.clip_norm, config.epsilon, rng)
        weight_update += fraction * private[:-1]
        bias_update += fraction * float(private[-1])
    return Model(global_model.weights + weight_update, global_model.bias + bias_update)


def evaluate(model: Model, x: Array, y: Array) -> dict[str, float]:
    probability = _sigmoid(x @ model.weights + model.bias)
    prediction = (probability >= 0.5).astype(int)
    return {
        "accuracy": float(accuracy_score(y, prediction)),
        "roc_auc": float(roc_auc_score(y, probability)),
        "log_loss": float(log_loss(y, probability)),
    }


def run(config: Config) -> dict[str, object]:
    config.validate()
    x_train, y_train, x_test, y_test = load_data(config.seed)
    partitions = partition_non_iid(x_train, y_train, config.clients, config.non_iid_alpha, config.seed)
    rng = np.random.default_rng(config.seed)
    model = Model.zeros(x_train.shape[1])
    history = []
    for round_number in range(1, config.rounds + 1):
        locals_ = [(train_local(model, x, y, config), len(y)) for x, y in partitions]
        model = aggregate(model, locals_, config, rng)
        history.append({"round": round_number, **evaluate(model, x_test, y_test)})
    isolated = [evaluate(train_local(Model.zeros(x_train.shape[1]), x, y, config), x_test, y_test)["accuracy"] for x, y in partitions]
    return {
        "config": asdict(config),
        "privacy": {"mechanism": "laplace" if config.epsilon else "none", "epsilon_per_round": config.epsilon, "composition_note": "Sequential composition upper bound is rounds * epsilon; this educational implementation is not a production accountant."},
        "isolated_mean_accuracy": float(np.mean(isolated)),
        "final": history[-1],
        "history": history,
    }
