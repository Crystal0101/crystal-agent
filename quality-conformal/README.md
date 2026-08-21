# QualityConformal

Code companion for the current Chinese manuscript *When Does Quality
Stratification Shrink Conformal Prediction Sets, and When Can It Not Restore
Target Coverage under Domain Shift?* It is an independent follow-up to DermaCal
and does not alter the published DermaCal analysis.

**Status:** active Chinese manuscript and reproducibility package; not yet a
final English submission release.

## Paper-to-code map

| Manuscript component | Repository location |
|---|---|
| LAC, Mondrian, APS/RAPS and controls | `quality_conformal.py` |
| Frozen DermaCal matched-condition analysis | `run_cached_dermacal.py` |
| Independent MedMNIST no-leak study | `run_medmnist_external.py` |
| HAM10000 → PAD-UFES-20 natural-domain study | `run_natural_domain.py`, `natural_domain_data.py` |
| Cluster-aware coverage audit | `reanalyse_clustered_coverage.py`, `analyze_natural_domain.py` |
| Prespecified protocols and claim boundaries | `docs/PROTOCOL_v0.1.md`, `docs/NATURAL_DOMAIN_PROTOCOL_v0.1.md` |
| Reproducibility manifest | `docs/EXPERIMENT_MANIFEST.json` |
| Auditable aggregate evidence | `results/` |

## Verification

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m pytest -q tests
```

Large datasets, checkpoints, cached arrays, logs and the evolving manuscript are
excluded. Published JSON/CSV files are compact evidence artifacts; their protocols
and limitations remain part of the release.

## Scientific boundary

The primary validity target is marginal split-conformal coverage under
exchangeability. Quality-conditional results are empirical unless the stratum is
a valid prespecified Mondrian partition with adequate calibration size. Synthetic
corruption and PAD-UFES-20 evaluations are distribution-shift stress tests, not
unconditional distribution-free guarantees. This code is not a medical device.

MIT License.
