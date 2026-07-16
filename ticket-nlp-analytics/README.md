# Ticket NLP Analytics

A clean-room reference pipeline for hierarchical service-ticket classification. It combines TF-IDF n-grams, calibrated class probabilities, an explicit human-review threshold and aggregate resolution/satisfaction metrics.

```bash
pip install -e ".[dev]"
pytest -q
```

Bring an approved taxonomy and de-identified labelled tickets. Do not train on secrets or personal data without governance controls. This repository contains no Momenta taxonomy, tickets, code or production metrics.

MIT License.
