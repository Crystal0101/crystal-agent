# DPFL Medical AI

A reproducible reference implementation of Laplace DP-FedAvg for breast-cancer prediction, reconstructed from the public methodology described in Ning Yang's MSc research materials.

Detailed architecture, equations, evaluation protocol and paper-writing guidance: [`docs/`](docs/README.md).

## What is implemented

- Wisconsin Diagnostic Breast Cancer dataset from scikit-learn (no patient data is bundled)
- stratified train/test preprocessing and Dirichlet non-IID client partitioning
- local logistic-regression training, weighted FedAvg, L2 update clipping
- optional client-update Laplace noise and explicit privacy-composition warning
- deterministic CLI, JSON results, unit tests, lint/type checks and CI

This repository does **not** claim to reproduce the dissertation's reported 15% improvement without the original experimental environment. Run results are new measurements produced by this implementation. The basic Laplace composition shown here is educational; clinical deployment requires a reviewed threat model, secure aggregation and a formal privacy accountant.

```bash
python -m venv .venv
.venv/bin/pip install -e ".[dev]"
.venv/bin/dpfl --rounds 5 --epsilon 10
.venv/bin/pytest -q
```

Use `--no-dp` for a non-private FedAvg comparison. Results are written to `results/result.json`.

## Privacy statement

Raw examples remain within simulated client partitions. This single-process research simulator demonstrates algorithmic flow; it is not a networked hospital deployment and provides no transport or infrastructure security.

## License

MIT
