"""
18 image corruption functions (6 types × 3 severity levels).
All functions take a PIL Image and return a PIL Image.
"""
import numpy as np
from PIL import Image, ImageFilter
import io


# ── Gaussian Noise ─────────────────────────────────────────────────────────────
def gaussian_noise(img: Image.Image, severity: int) -> Image.Image:
    sigma = [0.05, 0.15, 0.25][severity - 1]
    arr = np.array(img).astype(np.float32) / 255.0
    noise = np.random.randn(*arr.shape).astype(np.float32) * sigma
    arr = np.clip(arr + noise, 0, 1)
    return Image.fromarray((arr * 255).astype(np.uint8))


# ── Motion Blur ────────────────────────────────────────────────────────────────
def motion_blur(img: Image.Image, severity: int) -> Image.Image:
    kernel_size = [5, 11, 19][severity - 1]
    kernel = np.zeros((kernel_size, kernel_size), dtype=np.float32)
    kernel[kernel_size // 2, :] = 1.0 / kernel_size
    arr = np.array(img).astype(np.float32)
    from PIL import ImageFilter as IF
    pil_kernel = ImageFilter.Kernel(
        size=(kernel_size, kernel_size),
        kernel=(kernel.flatten() * 256).astype(int).tolist(),
        scale=256, offset=0,
    )
    try:
        return img.filter(pil_kernel)
    except Exception:
        # fallback: horizontal box blur via resize trick
        w, h = img.size
        small = img.resize((max(1, w // kernel_size), h), Image.BOX)
        return small.resize((w, h), Image.BILINEAR)


# ── Gaussian Blur ──────────────────────────────────────────────────────────────
def gaussian_blur(img: Image.Image, severity: int) -> Image.Image:
    radius = [1, 2, 4][severity - 1]
    return img.filter(ImageFilter.GaussianBlur(radius=radius))


# ── Brightness Shift (Gamma) ───────────────────────────────────────────────────
def brightness_shift(img: Image.Image, severity: int) -> Image.Image:
    gamma = [0.5, 0.3, 0.15][severity - 1]
    arr = np.array(img).astype(np.float32) / 255.0
    arr = np.power(np.clip(arr, 1e-8, 1.0), gamma)
    return Image.fromarray((arr * 255).astype(np.uint8))


# ── Color Shift ────────────────────────────────────────────────────────────────
def color_shift(img: Image.Image, severity: int) -> Image.Image:
    offset = [0.1, 0.2, 0.3][severity - 1]
    arr = np.array(img).astype(np.float32) / 255.0
    rng = np.random.RandomState(42)
    factors = 1.0 + rng.uniform(-offset, offset, size=(1, 1, 3)).astype(np.float32)
    arr = np.clip(arr * factors, 0, 1)
    return Image.fromarray((arr * 255).astype(np.uint8))


# ── JPEG Compression ───────────────────────────────────────────────────────────
def jpeg_compression(img: Image.Image, severity: int) -> Image.Image:
    quality = [75, 50, 25][severity - 1]
    buf = io.BytesIO()
    img.save(buf, format='JPEG', quality=quality)
    buf.seek(0)
    return Image.open(buf).copy()


# ── Registry ───────────────────────────────────────────────────────────────────
CORRUPTION_FNS = {
    'gaussian_noise':   gaussian_noise,
    'motion_blur':      motion_blur,
    'gaussian_blur':    gaussian_blur,
    'brightness_shift': brightness_shift,
    'color_shift':      color_shift,
    'jpeg_compression': jpeg_compression,
}

CORRUPTION_NAMES = list(CORRUPTION_FNS.keys())
SEVERITIES = [1, 2, 3]


def apply_corruption(img: Image.Image, name: str, severity: int) -> Image.Image:
    """Apply a named corruption at given severity (1–3)."""
    assert name in CORRUPTION_FNS, f"Unknown corruption: {name}"
    assert severity in SEVERITIES, f"Severity must be 1, 2 or 3"
    return CORRUPTION_FNS[name](img, severity)


def all_conditions() -> list[tuple[str, int]]:
    """Return list of (corruption_name, severity) for all 18 conditions."""
    return [(name, sev) for name in CORRUPTION_NAMES for sev in SEVERITIES]
