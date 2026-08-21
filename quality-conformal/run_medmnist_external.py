"""Independent MedMNIST confirmation benchmark with oracle corruption quality.

The official validation split is calibration data and the official test split
is untouched evaluation data. Each image receives a deterministic corruption
condition. Severity is used as an oracle quality covariate: if even oracle
severity conditioning is inefficient, that is a stronger boundary result than
failure of a noisy no-reference quality estimator.
"""

from __future__ import annotations

import argparse
import json
import random
import sys
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from PIL import Image
from torch.utils.data import DataLoader, Dataset, Subset
from torchvision import transforms

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "dermacal/experiments"))
from src.corrupt import CORRUPTION_NAMES, apply_corruption  # noqa: E402

from quality_conformal import (
    AdaptiveQualityMondrianConformal,
    ClassConditionalConformal,
    QualityMondrianConformal,
    prediction_set_metrics,
)


class SmallCNN(nn.Module):
    def __init__(self, channels, classes):
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(channels, 32, 3, padding=1), nn.BatchNorm2d(32), nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Conv2d(32, 64, 3, padding=1), nn.BatchNorm2d(64), nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Conv2d(64, 128, 3, padding=1), nn.BatchNorm2d(128), nn.ReLU(),
            nn.AdaptiveAvgPool2d(1),
        )
        self.head = nn.Linear(128, classes)

    def forward(self, x):
        return self.head(self.features(x).flatten(1))


class DeterministicMixedCorruption(Dataset):
    def __init__(self, base, channels, seed):
        self.base, self.channels, self.seed = base, channels, seed
        self.to_tensor = transforms.ToTensor()

    def __len__(self):
        return len(self.base)

    def __getitem__(self, idx):
        image, label = self.base[idx]
        if not isinstance(image, Image.Image):
            image = Image.fromarray(np.asarray(image))
        rng = np.random.default_rng(self.seed + idx)
        # Include clean plus all corruption types and severities.
        condition = int(rng.integers(0, 1 + len(CORRUPTION_NAMES) * 3))
        if condition == 0:
            severity, corruption = 0, "clean"
        else:
            offset = condition - 1
            corruption = CORRUPTION_NAMES[offset // 3]
            severity = offset % 3 + 1
            # gaussian_noise uses NumPy's legacy global RNG.
            np.random.seed(self.seed + idx)
            image = apply_corruption(image.convert("RGB"), corruption, severity)
        if self.channels == 1:
            image = image.convert("L")
        x = self.to_tensor(image)
        y = int(np.asarray(label).reshape(-1)[0])
        quality = 1.0 - severity / 3.0
        return x, y, np.float32(quality), condition


def collect(model, loader, device):
    model.eval(); logits=[]; labels=[]; quality=[]; conditions=[]
    with torch.no_grad():
        for x, y, q, c in loader:
            logits.append(model(x.to(device)).cpu().numpy())
            labels.append(y.numpy()); quality.append(q.numpy()); conditions.append(c.numpy())
    return (np.concatenate(logits), np.concatenate(labels).astype(int),
            np.concatenate(quality), np.concatenate(conditions))


def collect_clean(model, loader, device):
    model.eval(); logits=[]; labels=[]
    with torch.no_grad():
        for x, y in loader:
            logits.append(model(x.to(device)).cpu().numpy())
            labels.append(y.numpy())
    return np.concatenate(logits), np.concatenate(labels).reshape(-1).astype(int)


def softmax(logits):
    z=logits-logits.max(1,keepdims=True); e=np.exp(z); return e/e.sum(1,keepdims=True)


def stratified_model_selection_split(dataset, fraction, seed):
    """Split official training data; never use conformal calibration labels."""
    labels = np.asarray(dataset.labels).reshape(-1)
    rng = np.random.default_rng(seed)
    fit, selection = [], []
    for label in np.unique(labels):
        indices = np.flatnonzero(labels == label)
        rng.shuffle(indices)
        n_selection = max(1, int(round(len(indices) * fraction)))
        selection.extend(indices[:n_selection].tolist())
        fit.extend(indices[n_selection:].tolist())
    return sorted(fit), sorted(selection)


def train_model(model, train_loader, val_clean_loader, device, epochs, checkpoint):
    opt = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)
    criterion = nn.CrossEntropyLoss()
    best = float("inf")
    for epoch in range(epochs):
        model.train(); total=0.0; n=0
        for x, y in train_loader:
            x=x.to(device); y=y.reshape(-1).long().to(device)
            opt.zero_grad(); loss=criterion(model(x),y); loss.backward(); opt.step()
            total += loss.item()*len(y); n += len(y)
        model.eval(); val_loss=0.0; vn=0
        with torch.no_grad():
            for x,y in val_clean_loader:
                x=x.to(device); y=y.reshape(-1).long().to(device)
                loss=criterion(model(x),y); val_loss += loss.item()*len(y); vn += len(y)
        val_loss /= vn
        print(f"epoch {epoch+1}/{epochs} train_loss={total/n:.4f} val_loss={val_loss:.4f}")
        if val_loss < best:
            best=val_loss; torch.save(model.state_dict(),checkpoint)
    model.load_state_dict(torch.load(checkpoint,map_location=device,weights_only=True))


def main():
    import medmnist

    parser=argparse.ArgumentParser()
    parser.add_argument("--dataset",choices=["dermamnist","bloodmnist","pathmnist"],default="dermamnist")
    parser.add_argument("--epochs",type=int,default=10)
    parser.add_argument("--batch-size",type=int,default=128)
    parser.add_argument("--device",default="mps" if torch.backends.mps.is_available() else "cpu")
    parser.add_argument("--seed",type=int,default=2026)
    parser.add_argument("--reuse-checkpoint",action="store_true")
    args=parser.parse_args()
    torch.manual_seed(args.seed); np.random.seed(args.seed); random.seed(args.seed)
    info=medmnist.INFO[args.dataset]
    channels=info["n_channels"]; classes=len(info["label"])
    cls=getattr(medmnist,info["python_class"])
    clean_tf=transforms.ToTensor()
    data_root=ROOT / "AdaptiveKDFA/experiments/data"
    train=cls(split="train",root=data_root,download=True,transform=clean_tf)
    val_raw=cls(split="val",root=data_root,download=True,transform=None)
    test_raw=cls(split="test",root=data_root,download=True,transform=None)
    test_clean=cls(split="test",root=data_root,download=True,transform=clean_tf)
    train_indices, selection_indices = stratified_model_selection_split(
        train, fraction=.1, seed=args.seed)
    train_loader=DataLoader(Subset(train, train_indices),batch_size=args.batch_size,shuffle=True,num_workers=0)
    selection_loader=DataLoader(Subset(train, selection_indices),batch_size=args.batch_size,shuffle=False,num_workers=0)
    val_loader=DataLoader(DeterministicMixedCorruption(val_raw,channels,args.seed),batch_size=args.batch_size,shuffle=False,num_workers=0)
    test_loader=DataLoader(DeterministicMixedCorruption(test_raw,channels,args.seed+1000000),batch_size=args.batch_size,shuffle=False,num_workers=0)
    test_clean_loader=DataLoader(test_clean,batch_size=args.batch_size,shuffle=False,num_workers=0)
    model=SmallCNN(channels,classes).to(args.device)
    out=Path(__file__).resolve().parent/"results"; out.mkdir(exist_ok=True)
    ckpt=out/f"{args.dataset}_smallcnn_noleak_v2_seed{args.seed}.pt"
    if args.reuse_checkpoint and ckpt.exists():
        model.load_state_dict(torch.load(ckpt,map_location=args.device,weights_only=True))
    else:
        train_model(model,train_loader,selection_loader,args.device,args.epochs,ckpt)
    lcal,ycal,qcal,ccal=collect(model,val_loader,args.device)
    ltest,ytest,qtest,ctest=collect(model,test_loader,args.device)
    lclean,yclean=collect_clean(model,test_clean_loader,args.device)
    pcal,ptest=softmax(lcal),softmax(ltest)
    results=[]
    score_methods = (
        ("lac", lambda bins: QualityMondrianConformal(
            alpha=.1, n_quality_bins=bins, min_bin_size=30)),
        ("aps", lambda bins: AdaptiveQualityMondrianConformal(
            alpha=.1, n_quality_bins=bins, min_bin_size=30)),
        ("raps", lambda bins: AdaptiveQualityMondrianConformal(
            alpha=.1, n_quality_bins=bins, min_bin_size=30,
            penalty=.01, regularization_rank=3)),
    )
    for score_name, factory in score_methods:
        for bins in (1,2,3):
            method=factory(bins).fit(pcal,ycal,qcal)
            sets=method.predict_sets(ptest,qtest)
            strata = {}
            for quality in sorted(np.unique(qtest)):
                mask = qtest == quality
                strata[f"quality_{quality:.6f}"] = prediction_set_metrics(
                    sets[mask], ytest[mask], ptest[mask].argmax(1))
            results.append({"method":score_name,"bins":bins,
                            "quality_edges":list(method.summary_.quality_edges),
                            "by_quality":strata,
                            **prediction_set_metrics(sets,ytest,ptest.argmax(1))})
    # Controls: does observed quality add value beyond confidence or label
    # imbalance? Both are fitted without test labels.
    confidence_cal, confidence_test = pcal.max(1), ptest.max(1)
    confidence_method = QualityMondrianConformal(
        alpha=.1, n_quality_bins=3, min_bin_size=30).fit(
            pcal, ycal, confidence_cal)
    class_method = ClassConditionalConformal(alpha=.1, min_class_size=30).fit(
        pcal, ycal)
    for name, sets, edges in (
            ("lac_confidence_control",
             confidence_method.predict_sets(ptest, confidence_test),
             list(confidence_method.summary_.quality_edges)),
            ("lac_class_conditional_control", class_method.predict_sets(ptest), [])):
        strata = {}
        for quality in sorted(np.unique(qtest)):
            mask = qtest == quality
            strata[f"quality_{quality:.6f}"] = prediction_set_metrics(
                sets[mask], ytest[mask], ptest[mask].argmax(1))
        results.append({"method":name,"bins":3,"quality_edges":edges,
                        "by_quality":strata,
                        **prediction_set_metrics(sets,ytest,ptest.argmax(1))})
    condition_counts = {
        str(int(c)): int((ctest == c).sum()) for c in np.unique(ctest)
    }
    payload={"protocol":"independent-medmnist-oracle-quality-v2-noleak","dataset":args.dataset,
             "epochs":args.epochs,"seed":args.seed,"device":args.device,
             "n_train_fit":len(train_indices),"n_model_selection":len(selection_indices),
             "n_calibration":len(val_raw),"n_test":len(test_raw),
             "quality":"oracle inverse corruption severity",
             "clean_test_accuracy":float((lclean.argmax(1) == yclean).mean()),
             "mixed_test_point_accuracy":float((ltest.argmax(1) == ytest).mean()),
             "condition_counts":condition_counts,"results":results}
    target=out/f"external_{args.dataset}_seed{args.seed}.json"
    target.write_text(json.dumps(payload,indent=2),encoding="utf-8")
    print(json.dumps(results,indent=2)); print("saved",target)


if __name__=="__main__": main()
