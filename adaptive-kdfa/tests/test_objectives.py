import numpy as np
import pytest

from adaptive_kdfa import Schedule, communication_bytes, feature_alignment_loss, kd_loss


def test_kd_prefers_matching_logits():
    a = np.array([[3.0, 1.0]])
    assert kd_loss(a, a) < kd_loss(np.array([[1.0, 3.0]]), a)


def test_alignment_zero_when_equal():
    x = np.ones((2, 3))
    assert feature_alignment_loss([x, x]) == 0


def test_schedule_and_communication():
    assert Schedule(decay=0.5).at(2) == (0.25, 0.125)
    x = np.zeros((2, 3), dtype=np.float32)
    assert communication_bytes(x, x) == 48


def test_shape_guard():
    with pytest.raises(ValueError):
        feature_alignment_loss([np.zeros((2, 2)), np.zeros((2, 3))])
