# Quality-Conditional Conformal Selective Prediction

Public research companion for studying conformal prediction sets under observable image-quality variation.

## Research question

Can calibration examples be partitioned by a pre-specified quality measure to improve prediction-set efficiency or selective usefulness while preserving clearly stated coverage guarantees?

## Validity boundary

- Pooled split conformal prediction targets finite-sample marginal coverage under exchangeability.
- Quality-stratified coverage is empirical unless the strata form a valid Mondrian partition with adequate calibration support.
- Synthetic corruption shift is a stress test, not a distribution-free guarantee.
- Test labels must never be used to fit quality bins, thresholds or conformity scores.

## Current local implementation

The private research workspace contains deterministic pooled and quality-stratified split conformal methods, APS/RAPS controls, finite-sample quantiles, fallback handling for sparse strata, leakage tests and external-domain analysis. The public release is intentionally limited to this protocol summary until the code and natural-domain data workflow complete a release audit.

## Planned public release

1. Framework-neutral conformal core and unit tests.
2. Public-data example with four-way train/tune/calibration/test separation.
3. Machine-readable configuration and result schema.
4. Reproduction instructions that distinguish exchangeable evaluation from shift stress tests.

No medical images, patient records, checkpoints or manuscript drafts are included. This is research software, not a medical device.

MIT License.
