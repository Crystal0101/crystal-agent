"""
Unified interface for 4 model architectures.
All models return logits (not probabilities).
"""
import torch
import torch.nn as nn
import torchvision.models as tvm
from pathlib import Path


NUM_CLASSES = 7
AVAILABLE_MODELS = ['resnet50', 'efficientnet_b0', 'vit_b_16', 'dinov2_b']


def build_model(name: str, num_classes: int = NUM_CLASSES, pretrained: bool = True) -> nn.Module:
    name = name.lower()
    if name == 'resnet50':
        model = tvm.resnet50(weights=tvm.ResNet50_Weights.IMAGENET1K_V2 if pretrained else None)
        model.fc = nn.Linear(model.fc.in_features, num_classes)

    elif name == 'efficientnet_b0':
        model = tvm.efficientnet_b0(weights=tvm.EfficientNet_B0_Weights.IMAGENET1K_V1 if pretrained else None)
        model.classifier[1] = nn.Linear(model.classifier[1].in_features, num_classes)

    elif name == 'vit_b_16':
        model = tvm.vit_b_16(weights=tvm.ViT_B_16_Weights.IMAGENET1K_V1 if pretrained else None)
        model.heads.head = nn.Linear(model.heads.head.in_features, num_classes)

    elif name == 'dinov2_b':
        # DINOv2 via torch.hub (facebook research)
        model = torch.hub.load('facebookresearch/dinov2', 'dinov2_vitb14', pretrained=pretrained)
        in_features = model.norm.normalized_shape[0]
        model.head = nn.Linear(in_features, num_classes)

    else:
        raise ValueError(f"Unknown model: {name}. Choose from {AVAILABLE_MODELS}")

    return model


def get_device() -> torch.device:
    if torch.cuda.is_available():
        return torch.device('cuda')
    if torch.backends.mps.is_available():
        return torch.device('mps')
    return torch.device('cpu')


def load_checkpoint(model: nn.Module, ckpt_path: str, device: torch.device) -> nn.Module:
    state = torch.load(ckpt_path, map_location=device)
    model.load_state_dict(state['model_state_dict'])
    return model


def save_checkpoint(model: nn.Module, optimizer, epoch: int, path: str, extra: dict = None):
    payload = {
        'epoch': epoch,
        'model_state_dict': model.state_dict(),
        'optimizer_state_dict': optimizer.state_dict(),
    }
    if extra:
        payload.update(extra)
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    torch.save(payload, path)
