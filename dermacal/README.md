# DermaCal

Reusable code for benchmarking classifier calibration under six reproducible image degradations and applying Quality-Aware Confidence Adjustment (QACA). It contains no medical images or pretrained clinical model.

Detailed methodology, benchmark protocol, validity threats and paper figures: [`docs/`](docs/README.md).

```bash
pip install -e ".[dev]"
pytest -q
```

`quality` must be normalized to `[0,1]`; higher means better. `QACA.fit` selects two scalar parameters on a calibration split using Brier score. This is research software, not a medical device. The original local experiments and manuscript are not copied because they contain large datasets, generated artifacts and work-in-progress material.

MIT License.
