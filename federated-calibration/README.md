# Federated Calibration

Public research companion for client-level calibration and worst-institution reliability under federated heterogeneity.

## Research question

How should a federated medical model be evaluated when average discrimination can improve while calibration or selective risk deteriorates for particular institutions?

## Confirmatory principles

- Freeze the protocol version, code manifest and client partition before analysis.
- Report client-level calibration and worst-client behaviour alongside global averages.
- Use paired comparisons across matched seeds and control families of related hypotheses.
- Treat synthetic client heterogeneity as a controlled benchmark, not evidence of real institutional generalisation.
- Do not mix pilot outputs or historical AdaptiveKDFA files with confirmatory results.

## Current status

The local research workspace has completed confirmatory DermaMNIST and PathMNIST matrices and maintains a separate sensitivity queue. Natural-site shift remains an external-validity gap until an appropriate real multi-site dataset and protocol are available.

The public repository currently documents the protocol boundary. A clean analysis package will be released after configuration, manifest and result-schema checks are separated from the private experiment workspace.

No medical data, model checkpoints, experiment logs or manuscript drafts are included. This is research software, not a medical device.

MIT License.
