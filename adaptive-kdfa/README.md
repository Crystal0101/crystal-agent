# Adaptive KD+FA

Tested, framework-neutral primitives for heterogeneous federated learning: temperature-scaled knowledge distillation, projected-feature alignment, communication accounting and fixed/decayed coefficient schedules.

```bash
pip install -e ".[dev]"
pytest -q
```

This public package extracts the reusable mathematical core from local research experiments. It does not bundle datasets or claim that a simple adaptive schedule improves accuracy; local results found no statistically clear advantage, so scheduling remains an explicit experimental option.

MIT License.
