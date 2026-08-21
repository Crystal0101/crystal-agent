# Protocol v0.1 — Quality-Conditional Conformal Selective Prediction

## Primary question

Does a pre-specified quality-stratified (Mondrian) split-conformal procedure
improve prediction-set efficiency or singleton selective risk while maintaining
coverage, compared with pooled split conformal, under medical image degradation?

## Independence from DermaCal

This is a follow-up study. It reuses frozen model logits and quality measurements
as research infrastructure, but adds a distinct inferential target: finite-sample
prediction-set coverage and quality-stratified efficiency. It must not duplicate
DermaCal tables or present QACA results as a new contribution.

## Data roles

- Training: frozen DermaCal model training sets/checkpoints.
- Calibration: DermaCal patient-disjoint validation split only.
- Test: DermaCal patient-disjoint test split only.
- Test labels may be loaded only after prediction sets are constructed.

## Initial baselines

1. Pooled split conformal with nonconformity `1 - p_true`.
2. Quality-Mondrian split conformal using calibration-derived quantile strata.
3. Later additions: APS/RAPS, class-conditional conformal, confidence-threshold
   selective prediction, QACA probabilities, and a quality-aware continuous
   score only if it can be fitted without test feedback.

## Primary outcomes

- marginal coverage and gap from target coverage;
- average prediction-set size;
- singleton fraction and singleton selective risk;
- per-quality-stratum coverage with confidence intervals;
- failure under unseen corruption and natural external domain shift.

## Claim boundary

Matched-condition split conformal can support a finite-sample marginal coverage
statement under exchangeability within that condition. Synthetic corruption
mixtures, held-out corruption types and natural external domains violate or
challenge exchangeability; those results are stress tests, not guarantees.

## Initial result (ResNet-50, 18 matched corruption/severity conditions)

At target coverage 0.90:

| Method | Mean coverage | Mean coverage gap | Mean set size | Mean singleton risk |
|---|---:|---:|---:|---:|
| Pooled split conformal | 0.9212 | +0.0212 | 2.4352 | 0.0941 |
| Quality-Mondrian | 0.9204 | +0.0204 | 2.4379 | 0.0905 |

These are descriptive averages over conditions, not uncertainty-adjusted method
comparisons. The initial hypothesis of a clear efficiency gain is **not**
supported: set size and coverage are nearly identical, and the singleton-risk
difference is small. The study will continue as a controlled investigation of
when quality conditioning helps, is neutral, or fails.

## Next locked analyses

1. Repeat all four frozen DermaCal backbones.
2. Report condition-level paired differences and bootstrap intervals.
3. Sensitivity to alpha, number of quality strata and minimum stratum size.
4. Leave-one-corruption-out calibration as a stress test with no guarantee claim.
5. Add at least one independent medical dataset or natural domain partition
   before describing the work as general medical distribution-shift evidence.

## Four-backbone update

The cached experiment was then repeated without tuning changes for ResNet-50,
EfficientNet-B0, DINOv2-B and ViT-B/16: 72 paired model × corruption × severity
conditions in total.

| Method | Mean coverage | Mean set size | Mean singleton risk |
|---|---:|---:|---:|
| Pooled split conformal | 0.9119 | 2.5045 | 0.1426 |
| Quality-Mondrian | 0.9130 | 2.5184 | 0.1439 |

Mean paired differences (quality-Mondrian minus pooled) were +0.0011 coverage,
+0.0140 set size and +0.0013 singleton risk; medians were zero for all three.
Thus the current discrete quality-stratification method does **not** support the
intended improvement claim and is slightly less efficient on average. This is a
valid go/no-go result: the next step is sensitivity and failure analysis, not
selective reporting or inventing a stronger method after looking at test labels.

## Sensitivity and exploratory method update

A predefined grid over target miscoverage `{0.05, 0.10, 0.20}`, quality bins
`{2,3,4,5}` and minimum stratum sizes `{20,50,100}` did not reverse the result.
Across every grid point, quality-Mondrian had a larger mean prediction-set size
than pooled conformal (increase approximately 0.0094–0.0290 labels). Differences
in coverage and singleton risk were small and inconsistent. Minimum stratum size
had no effect because the existing calibration strata exceeded all thresholds.

After observing this null result, an explicitly **exploratory** continuous
quality-normalised score was implemented with a three-way split: one subset fits
a monotone quality→nonconformity scale and a disjoint subset calibrates the
normalised conformal score. Against a pooled method given the same conformal
calibration subset, it was worse:

| Method | Mean coverage | Mean set size | Mean singleton risk |
|---|---:|---:|---:|
| Pooled, equal budget | 0.9122 | 2.5152 | 0.1543 |
| Quality-normalised | 0.9161 | 3.0174 | 0.1622 |

Because this method was developed after inspecting the original results, it is
not confirmatory evidence. The consistent failure indicates that BRISQUE-like
quality alone may not provide useful instance-adaptive information beyond model
confidence. A submission-quality paper now requires independent datasets and a
reframed question about the limits and conditions of quality conditioning; it
must not retain an unsupported “quality conditioning improves efficiency” title.

## Independent MedMNIST confirmation (five seeds)

An independent benchmark was added after the cached DermaCal analysis. A small
CNN is trained on 90% of each official training split and selected on a disjoint
10% training subset; the official validation split is used only for conformal
calibration and the official test split is untouched evaluation data. An earlier
pilot that used validation labels for checkpoint selection was invalidated and
fully rerun. Images independently receive clean or one of six corruption
types at severity 1–3. In this diagnostic experiment, inverse corruption
severity is an oracle quality signal. Reported intervals are two-sided 95% t
intervals over ten paired training/corruption seeds.

| Dataset | Method | Coverage | Mean set size | Singleton selective risk |
|---|---|---:|---:|---:|
| DermaMNIST | pooled | 0.9019 | 3.8036 | 0.1287 |
| DermaMNIST | 3 quality strata | 0.9018 | 3.8187 | 0.0683 |
| BloodMNIST | pooled | 0.8944 | 6.6601 | 0.8250 |
| BloodMNIST | 3 quality strata | 0.8994 | 5.6005 | 0.1466 |

Paired three-stratum-minus-pooled differences were:

- DermaMNIST: coverage −0.0001 (95% CI −0.0059, 0.0057), set size +0.0151
  (−0.0896, 0.1198), singleton risk −0.0604 (−0.1386, 0.0177).
- BloodMNIST: coverage +0.0051 (−0.0058, 0.0159), set size −1.0596
  (−1.2240, −0.8952), singleton risk −0.6784 (−0.7578, −0.5991).

This supports a narrower mechanism statement: an informative quality variable
that separates genuinely different degradation regimes can materially improve
efficiency, whereas noisy within-condition BRISQUE stratification did not. It
does **not** establish conditional coverage: severity-2 and severity-1 strata
undercovered on both datasets even after removing checkpoint-selection leakage.
The same official test images recur across seeds, so pooling their Bernoulli
counts would be pseudo-replication. The corrected seed-level 95% t intervals for
the two intermediate quality strata are approximately 0.862–0.882 and
0.864–0.881. Quality stratification approached marginal coverage partly by
overcoverage at the worst severity, not uniform group reliability.

This inferential-unit correction was made after the reporting audit on
2026-08-05. Historical pooled-image exact intervals are excluded from all paper
claims; `results/external_aggregate.json` now contains seed-level intervals only.

### Remaining confirmatory requirements

1. add APS and RAPS pooled/Mondrian baselines under identical data splits;
2. add class-conditional and confidence-only Mondrian controls to determine
   whether quality contributes beyond model confidence and label imbalance;
3. run a natural quality/domain partition without oracle severity;
4. report seed-level intervals per quality stratum and paired-seed uncertainty;
   never pool repeated official test images across seeds as independent trials;
5. freeze title, hypotheses and primary outcomes before any new method is fitted.
