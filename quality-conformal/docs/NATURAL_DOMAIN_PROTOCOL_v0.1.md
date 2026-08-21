# Natural-domain protocol v0.1 — dermoscopy to smartphone clinical images

## Frozen domains

- source/training domain: HAM10000 dermoscopic images;
- model-selection domain: patient-disjoint subset of HAM10000 training data;
- conformal-calibration domain: patient-disjoint HAM10000 validation data;
- internal test domain: patient-disjoint HAM10000 test data;
- external natural domain: PAD-UFES-20 raw smartphone clinical images.

PAD-UFES-20 labels and images are not used to select thresholds, quality-bin
edges, model checkpoints, preprocessing hyperparameters, or conformal methods.
External-domain results are stress tests and carry no exchangeability guarantee.

## Common five-class task

| HAM10000 | PAD-UFES-20 | Canonical label |
|---|---|---|
| akiec | ACK | actinic keratosis |
| bcc | BCC | basal cell carcinoma |
| mel | MEL | melanoma |
| nv | NEV | nevus |
| bkl | SEK | seborrheic keratosis |

HAM10000 `df`/`vasc` and PAD-UFES-20 `SCC` are excluded before patient-level
splitting. No post-test remapping is allowed.

The primary model is retrained with a five-class output head after exclusions.
Cropping and renormalising an existing seven-class DermaCal output is permitted
only as a labelled sensitivity analysis because discarded-class probability mass
can change calibration. It is not interchangeable with the primary model.

HAM10000 uses a deterministic class-stratified lesion-group split with four
roles: 60% training, 10% model selection, 15% conformal calibration and 15%
internal testing. PAD-UFES-20 remains a separate patient-grouped external test
domain; its labels are never used for any of the four source-domain roles.

## Primary comparisons

At target marginal coverage 0.90, compare pooled LAC and three-bin quality LAC.
Confidence-Mondrian and class-conditional LAC are controls. APS/RAPS are secondary
score families. Report coverage, average set size, singleton fraction/risk and
group-aware intervals within declared quality groups. HAM10000 uses lesion as
the resampling unit and PAD-UFES-20 uses patient as the resampling unit; ordinary
image-level Clopper--Pearson intervals are retained only as historical output.

## Quality handling

BRISQUE normalisation parameters and quality-bin definitions are fitted on
HAM10000 calibration images only, then frozen for PAD-UFES-20. Report clipping
rates on PAD-UFES-20. A result is not called quality-conditional validity when
any declared quality group undercovers.

## Leakage controls

- split by patient/lesion, never by image alone;
- train/model-selection/calibration/test roles are disjoint;
- PAD-UFES-20 labels are opened only for final evaluation;
- repeated images of one lesion remain in the same split;
- retain dataset version, download URL, archive SHA-256 and row exclusions.

## Post-audit interval correction (2026-08-05)

The original result JSON used image-level exact binomial intervals even though
some lesions/patients contribute multiple images. Frozen checkpoints are therefore
re-evaluated without retraining, point estimates must exactly reproduce, and
10,000-replicate cluster-bootstrap intervals are computed over whole lesions or
patients. This correction does not create an exchangeability guarantee for the
external domain and does not turn the three architectures into random replicates.

## Go/no-go interpretation

- positive: quality stratification improves efficiency with comparable coverage
  and no systematic declared-group undercoverage;
- boundary result: marginal efficiency improves but a quality group undercovers;
- null: no efficiency improvement after coverage matching;
- failure: results depend on label remapping, test-selected preprocessing or
  image-level leakage.
