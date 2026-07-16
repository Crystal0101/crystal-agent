import numpy as np
import pytest

from dpfl.core import Config, Model, aggregate, load_data, partition_non_iid, privatize_update, run


def test_partition_preserves_samples():
    x, y, _, _ = load_data()
    parts = partition_non_iid(x, y, 5, 0.5, 42)
    assert sum(len(labels) for _, labels in parts) == len(y)
    assert all(len(labels) for _, labels in parts)


def test_clipping_without_noise():
    update = privatize_update(np.array([3.0, 4.0]), 1.0, None, np.random.default_rng(1))
    assert np.linalg.norm(update) == pytest.approx(1.0)


def test_weighted_aggregation_without_noise():
    base = Model.zeros(1)
    result = aggregate(base, [(Model(np.array([1.0]), 0.0), 1), (Model(np.array([3.0]), 0.0), 3)], Config(epsilon=None, clip_norm=10), np.random.default_rng(1))
    assert result.weights[0] == pytest.approx(2.5)


def test_smoke_run_is_reproducible():
    config = Config(rounds=2, clients=3, local_epochs=1, epsilon=10.0, seed=7)
    first, second = run(config), run(config)
    assert first["final"] == second["final"]
    assert 0 <= first["final"]["accuracy"] <= 1
