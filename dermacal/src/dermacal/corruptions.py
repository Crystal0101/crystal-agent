from __future__ import annotations

import io

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter


def corrupt(image: Image.Image, kind: str, severity: int, seed: int = 0) -> Image.Image:
    if severity not in (1, 2, 3):
        raise ValueError("severity must be 1, 2 or 3")
    rgb, scale = image.convert("RGB"), severity / 3
    if kind == "blur":
        return rgb.filter(ImageFilter.GaussianBlur(radius=1 + 3 * scale))
    if kind == "brightness":
        return ImageEnhance.Brightness(rgb).enhance(1 - 0.55 * scale)
    if kind == "contrast":
        return ImageEnhance.Contrast(rgb).enhance(1 - 0.65 * scale)
    if kind == "noise":
        array = np.asarray(rgb).astype(float)
        noise = np.random.default_rng(seed).normal(0, 8 + 28 * scale, array.shape)
        return Image.fromarray(np.clip(array + noise, 0, 255).astype("uint8"))
    if kind == "jpeg":
        buffer = io.BytesIO()
        rgb.save(buffer, "JPEG", quality=int(70 - 55 * scale))
        buffer.seek(0)
        return Image.open(buffer).convert("RGB")
    if kind == "resolution":
        width, height = rgb.size
        size = (
            max(1, int(width * (1 - 0.7 * scale))),
            max(1, int(height * (1 - 0.7 * scale))),
        )
        return rgb.resize(size).resize(rgb.size)
    raise ValueError(f"unsupported corruption: {kind}")
