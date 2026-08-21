# DermaCal

Code companion for *DermaCal: Reliability Benchmarking and Quality-Aware
Confidence Calibration of Dermatology AI under Real-World Image Degradation*.

**Status:** paper completed and published; bibliographic metadata/DOI should be
added here when the final publisher record is available.

DermaCal evaluates calibration degradation across common image corruptions and
implements Quality-Aware Confidence Adjustment (QACA), a post-hoc temperature
rule whose correction strength depends on image quality.

## Paper-to-code map

| Paper component | Repository location |
|---|---|
| QACA definition and calibration metrics | `src/dermacal/calibration.py` |
| Reusable corruption primitives | `src/dermacal/corruptions.py` |
| Full corruption benchmark | `experiments/run_benchmark.py` |
| Backbone training | `experiments/train.py`, `experiments/src/models.py` |
| QACA fitting and evaluation | `experiments/run_qaca.py`, `experiments/src/qaca.py` |
| Ablation, LOCO, risk-coverage and uncertainty analyses | `experiments/run_qaca_*.py` |
| Publication-linked aggregate outputs | `experiments/results/qaca/` |

## Quick verification

```bash
python -m pytest -q dermacal/tests
```

See [`experiments/README.md`](./experiments/README.md) for end-to-end
reproduction. Raw HAM10000 images, model weights, cached logits and local logs
are intentionally excluded. This is research software, not a medical device.

MIT License.
