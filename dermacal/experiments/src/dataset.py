"""
HAM10000 dataset loader with patient-level stratified split.
"""
import os
import numpy as np
import pandas as pd
import torch
from pathlib import Path
from PIL import Image
from torch.utils.data import Dataset, DataLoader
import torchvision.transforms as T


CLASSES = ['mel', 'nv', 'bcc', 'akiec', 'bkl', 'df', 'vasc']
CLASS_TO_IDX = {c: i for i, c in enumerate(CLASSES)}
IDX_TO_CLASS = {i: c for c, i in CLASS_TO_IDX.items()}

# ImageNet stats (used for all models)
MEAN = [0.485, 0.456, 0.406]
STD  = [0.229, 0.224, 0.225]


def denormalize_to_uint8(img) -> np.ndarray:
    """
    Correctly invert Normalize(MEAN, STD) on a CHW tensor and return an
    HxWx3 uint8 array. If `img` is already a PIL Image / uint8 array (not a
    normalized tensor), returns it unchanged as a numpy array.

    This exists because several places in the codebase previously did
    `(tensor * 255).astype(uint8)` directly on an *already-normalized*
    tensor (values roughly in [-2, 2.7]), which either wraps around (no
    clamp) or clips almost everything to black/white (with clamp(0,1)) —
    both silently destroy the image before it is corrupted or BRISQUE-
    scored. Multiplying back by STD and adding MEAN properly recovers the
    original [0,1]-range image first.
    """
    if isinstance(img, torch.Tensor):
        mean = torch.tensor(MEAN, dtype=img.dtype).view(3, 1, 1)
        std  = torch.tensor(STD,  dtype=img.dtype).view(3, 1, 1)
        denorm = (img * std + mean).clamp(0.0, 1.0)
        return (denorm.permute(1, 2, 0).numpy() * 255).astype(np.uint8)
    return np.array(img)


def get_transforms(split: str, img_size: int = 224):
    if split == 'train':
        return T.Compose([
            T.RandomResizedCrop(img_size, scale=(0.8, 1.0)),
            T.RandomHorizontalFlip(),
            T.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
            T.ToTensor(),
            T.Normalize(MEAN, STD),
        ])
    else:
        return T.Compose([
            T.Resize(int(img_size * 1.14)),
            T.CenterCrop(img_size),
            T.ToTensor(),
            T.Normalize(MEAN, STD),
        ])


class HAM10000Dataset(Dataset):
    def __init__(self, df: pd.DataFrame, img_dirs: list[str], transform=None):
        self.df = df.reset_index(drop=True)
        self.img_dirs = [Path(d) for d in img_dirs]
        self.transform = transform

    def __len__(self):
        return len(self.df)

    def _find_image(self, image_id: str) -> Path:
        for d in self.img_dirs:
            p = d / f"{image_id}.jpg"
            if p.exists():
                return p
        raise FileNotFoundError(f"Image not found: {image_id}")

    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        img = Image.open(self._find_image(row['image_id'])).convert('RGB')
        if self.transform:
            img = self.transform(img)
        label = CLASS_TO_IDX[row['dx']]
        return img, label


def load_splits(data_root: str, img_size: int = 224, seed: int = 42):
    """
    Patient-level stratified split: 70/10/20.
    Returns (train_ds, val_ds, test_ds, class_weights).
    """
    data_root = Path(data_root)
    meta_path = data_root / 'HAM10000_metadata.csv'
    if not meta_path.exists():
        raise FileNotFoundError(
            f"Metadata not found at {meta_path}\n"
            "Download HAM10000 from Kaggle and place HAM10000_metadata.csv here."
        )

    meta = pd.read_csv(meta_path)
    img_dirs = [
        str(data_root / 'HAM10000_images_part_1'),
        str(data_root / 'HAM10000_images_part_2'),
    ]

    # Patient-level split
    patients = meta['lesion_id'].unique()
    rng = pd.Series(patients).sample(frac=1, random_state=seed)
    n = len(rng)
    train_p = set(rng.iloc[:int(n * 0.70)])
    val_p   = set(rng.iloc[int(n * 0.70):int(n * 0.80)])
    test_p  = set(rng.iloc[int(n * 0.80):])

    train_df = meta[meta['lesion_id'].isin(train_p)]
    val_df   = meta[meta['lesion_id'].isin(val_p)]
    test_df  = meta[meta['lesion_id'].isin(test_p)]

    # Class weights for imbalanced training
    counts = train_df['dx'].value_counts()
    weights = {c: 1.0 / counts[c] for c in CLASSES}
    total = sum(weights.values())
    class_weights = [weights[c] / total * len(CLASSES) for c in CLASSES]

    train_ds = HAM10000Dataset(train_df, img_dirs, get_transforms('train', img_size))
    val_ds   = HAM10000Dataset(val_df,   img_dirs, get_transforms('val',   img_size))
    test_ds  = HAM10000Dataset(test_df,  img_dirs, get_transforms('test',  img_size))

    print(f"Split: train={len(train_ds)}  val={len(val_ds)}  test={len(test_ds)}")
    return train_ds, val_ds, test_ds, class_weights


def get_loader(ds: Dataset, batch_size: int = 32, shuffle: bool = False, num_workers: int = 4):
    return DataLoader(ds, batch_size=batch_size, shuffle=shuffle,
                      num_workers=num_workers, pin_memory=True)
