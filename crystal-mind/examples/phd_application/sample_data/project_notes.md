# Project Notes — Scattered

## DermaCal

- Dataset: HAM10000, 10015 images, 7 classes (MEL, NV, BCC, AKIEC, BKL, DF, VASC)
- Class imbalance is severe: NV (nevus) is 67% of data
- Need weighted loss or oversampling
- Corruption types: Gaussian noise, shot noise, impulse noise, defocus blur, glass blur,
  motion blur, zoom blur, snow, frost, fog, brightness, contrast, elastic, pixelate,
  JPEG compression, saturate, spatter, speckle

## AdaptiveKDFA

- MNIST done: 54/54 runs complete
- CIFAR-10 running now (launched today in tmux)
- Key question: does adaptive distillation weight outperform fixed weight on non-iid data?
- alpha=0.1 (more heterogeneous) should show bigger gains from adaptive

## Paper deadlines

- DermaCal: submit to MICCAI 2026 (deadline March 2026?)
- AdaptiveKDFA: submit to ICLR 2026 or AAAI 2026

## Random TODO

- Fix the citation list in DermaCal paper (some are placeholder)
- Run experiments once HAM10000 downloads
- Check if ViT needs gradient checkpointing to fit on M2 16GB
- Write abstract for AdaptiveKDFA paper
