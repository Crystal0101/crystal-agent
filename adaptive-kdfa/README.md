# Adaptive KD+FA

Tested, framework-neutral primitives for heterogeneous federated learning: temperature-scaled knowledge distillation, projected-feature alignment, communication accounting and fixed/decayed coefficient schedules.

Detailed objectives, communication analysis and experimental protocol: [`docs/`](docs/README.md).

```bash
pip install -e ".[dev]"
pytest -q
```

This public package extracts the reusable mathematical core from local research experiments. It does not bundle datasets or claim that a simple adaptive schedule improves accuracy. The current confirmatory study has completed its main matrix, independent KD/FA scheduling study and reference-set-size sensitivity analysis, but conclusions remain dataset- and protocol-dependent. Projection mechanisms, architecture-client mapping rotation and external validation remain open; scheduling therefore remains an explicit experimental option rather than an established improvement.

MIT License.
