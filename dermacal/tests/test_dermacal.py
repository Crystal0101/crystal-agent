import numpy as np
from PIL import Image
from dermacal import QACA, corrupt, expected_calibration_error


def test_all_corruptions_preserve_size():
    image = Image.new("RGB", (32, 24), "gray")
    for kind in ("blur", "brightness", "contrast", "noise", "jpeg", "resolution"):
        assert corrupt(image, kind, 2).size == image.size


def test_qaca_reduces_confidence_for_low_quality():
    logits = np.array([[5.0, 0.0], [5.0, 0.0]])
    probs = QACA(1, 2).transform(logits, np.array([1.0, 0.0]))
    assert probs[1].max() < probs[0].max()


def test_fit_and_ece_are_valid():
    logits = np.array([[3.0, 0.0], [3.0, 0.0], [0.0, 3.0], [0.0, 3.0]])
    labels = np.array([0, 1, 1, 0])
    quality = np.array([1.0, 0.2, 1.0, 0.2])
    model = QACA.fit(logits, labels, quality)
    assert (
        0 <= expected_calibration_error(model.transform(logits, quality), labels) <= 1
    )
