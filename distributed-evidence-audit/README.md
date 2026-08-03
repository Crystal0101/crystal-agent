# Distributed Optimisation Evidence Audit

Public research companion for assessing whether systems papers report enough evidence to judge efficiency at matched optimisation quality.

## Review question

For synchronous data-parallel gradient communication methods, is the published evidence sufficient to determine an iso-accuracy time-to-target benefit under a clearly identified hardware, network and training regime?

## Evidence model

The audit separates four claims that must not be conflated:

1. communication volume or compression ratio;
2. end-to-end step time or throughput;
3. convergence to a matched target;
4. total time-to-target under a specified system regime.

A paper can report a useful method while still leaving the final systems-speed claim unidentifiable. “Not identifiable” is an evidence-availability classification, not a judgement of paper quality or method effectiveness.

## Reproducibility boundary

- Formal search, deduplication and screening counts must be machine-auditable.
- Pilot coding and formal-search coding remain separate denominators.
- Independent double coding cannot be replaced by the primary author's later recoding.
- Simulated regime maps and codec microbenchmarks are explanatory tools, not cluster-scale measurements.
- Final accuracy cannot be used to infer steps-to-target.

## Current status

The local workspace contains a frozen review protocol, a formal-search ledger, structured evidence fields, validation scripts and case-level holdout replay. The systematic-search completion declaration and independent second-coder dataset remain hard gates before submission-level claims.

This public directory documents the review logic without publishing licensed full texts, private annotations or incomplete manuscript material.

MIT License.
