"""
Fine-tune one model on HAM10000 training set.
Usage:
  python train.py --model resnet50 --epochs 50 --batch_size 32
"""
import argparse
import json
import time
from pathlib import Path

import torch
import torch.nn as nn
import numpy as np

from src.dataset import load_splits, get_loader
from src.models import build_model, get_device, save_checkpoint


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument('--model',       default='resnet50',
                   choices=['resnet50', 'efficientnet_b0', 'vit_b_16', 'dinov2_b'])
    p.add_argument('--data_root',   default='data/HAM10000')
    p.add_argument('--epochs',      type=int, default=50)
    p.add_argument('--batch_size',  type=int, default=32)
    p.add_argument('--lr',          type=float, default=1e-4)
    p.add_argument('--patience',    type=int, default=10)
    p.add_argument('--seed',        type=int, default=42)
    p.add_argument('--out_dir',     default='results/baseline')
    return p.parse_args()


def set_seed(seed: int):
    torch.manual_seed(seed)
    np.random.seed(seed)


def main():
    args = parse_args()
    set_seed(args.seed)

    device = get_device()
    print(f"Device: {device}")

    train_ds, val_ds, test_ds, class_weights = load_splits(args.data_root, seed=args.seed)
    train_loader = get_loader(train_ds, args.batch_size, shuffle=True)
    val_loader   = get_loader(val_ds,   args.batch_size, shuffle=False)

    model = build_model(args.model).to(device)

    weights_t = torch.tensor(class_weights, dtype=torch.float32, device=device)
    criterion  = nn.CrossEntropyLoss(weight=weights_t)
    optimizer  = torch.optim.Adam(model.parameters(), lr=args.lr)
    scheduler  = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)

    out_dir = Path(args.out_dir) / args.model
    out_dir.mkdir(parents=True, exist_ok=True)

    best_val_loss = float('inf')
    no_improve    = 0
    history       = []

    for epoch in range(1, args.epochs + 1):
        # ── train ──────────────────────────────────────────────────────────────
        model.train()
        train_loss, correct, total = 0.0, 0, 0
        t0 = time.time()
        for imgs, labels in train_loader:
            imgs, labels = imgs.to(device), labels.to(device)
            optimizer.zero_grad()
            logits = model(imgs)
            loss   = criterion(logits, labels)
            loss.backward()
            optimizer.step()
            train_loss += loss.item() * len(labels)
            correct    += (logits.argmax(1) == labels).sum().item()
            total      += len(labels)

        train_loss /= total
        train_acc   = correct / total
        scheduler.step()

        # ── validate ────────────────────────────────────────────────────────────
        model.eval()
        val_loss, val_correct, val_total = 0.0, 0, 0
        with torch.no_grad():
            for imgs, labels in val_loader:
                imgs, labels = imgs.to(device), labels.to(device)
                logits = model(imgs)
                loss   = criterion(logits, labels)
                val_loss    += loss.item() * len(labels)
                val_correct += (logits.argmax(1) == labels).sum().item()
                val_total   += len(labels)

        val_loss /= val_total
        val_acc   = val_correct / val_total
        elapsed   = time.time() - t0

        row = {'epoch': epoch, 'train_loss': train_loss, 'train_acc': train_acc,
               'val_loss': val_loss, 'val_acc': val_acc, 'time': elapsed}
        history.append(row)
        print(f"[{epoch:03d}/{args.epochs}] "
              f"train_loss={train_loss:.4f} acc={train_acc:.3f}  "
              f"val_loss={val_loss:.4f} acc={val_acc:.3f}  "
              f"({elapsed:.1f}s)")

        # ── checkpoint & early stopping ─────────────────────────────────────────
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            no_improve    = 0
            save_checkpoint(model, optimizer, epoch,
                            str(out_dir / 'best.pt'),
                            extra={'val_loss': val_loss, 'val_acc': val_acc})
            print(f"  Saved best checkpoint (val_loss={val_loss:.4f})")
        else:
            no_improve += 1
            if no_improve >= args.patience:
                print(f"Early stopping at epoch {epoch}")
                break

    # Save training history
    with open(out_dir / 'history.json', 'w') as f:
        json.dump(history, f, indent=2)
    print(f"Training complete. Best val_loss={best_val_loss:.4f}")


if __name__ == '__main__':
    main()
