# DermaCal paper experiments

This directory contains the experiment implementation used by the DermaCal
paper. The lightweight package in `../src/dermacal` exposes the central QACA
and corruption primitives; this directory preserves the complete benchmark
entry points and the small, auditable JSON outputs.

## Layout

- `src/`: datasets, corruptions, models, calibration and evaluation code.
- `train.py`: train the four HAM10000 backbones.
- `run_benchmark.py`: generate the corruption benchmark and frozen logits.
- `run_qaca*.py`: main QACA analysis and prespecified secondary analyses.
- `results/qaca/`: publication-linked aggregate JSON evidence.

## Reproduction

```bash
cd dermacal/experiments
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
./download_ham10000.sh
.venv/bin/python train.py --model resnet50
.venv/bin/python run_benchmark.py --model resnet50 \
  --ckpt results/baseline/resnet50/best.pt
.venv/bin/python run_qaca.py --model resnet50
```

Repeat the model-specific commands for `efficientnet_b0`, `vit_b_16` and
`dinov2_b`. Model weights, raw images, frozen logits and local logs are excluded
because of size, licensing and portability concerns. Credentials are read from
the user's local Kaggle configuration and must never be committed.

The software is research code, not a medical device or clinical recommendation.
