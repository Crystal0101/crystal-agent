"""
Pre-download all pretrained weights before training.
Run this once to populate the torch hub cache.
"""
import os, sys
os.environ.pop('ALL_PROXY', None); os.environ.pop('HTTPS_PROXY', None)
os.environ.pop('HTTP_PROXY', None); os.environ.pop('all_proxy', None)
os.environ.pop('https_proxy', None); os.environ.pop('http_proxy', None)

sys.path.insert(0, 'src')
from src.models import build_model

for name in ['resnet50', 'efficientnet_b0', 'vit_b_16', 'dinov2_b']:
    print(f"\n[{name}] downloading weights...")
    try:
        m = build_model(name, pretrained=True)
        del m
        print(f"[{name}] OK")
    except Exception as e:
        print(f"[{name}] FAILED: {e}")
        sys.exit(1)

print("\nAll weights cached. Ready to train.")
