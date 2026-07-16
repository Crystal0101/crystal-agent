# Changelog

All notable changes to crystal-mind are documented here.

## [0.2.0] — Production hardening

### Changed
- Plans now use a versioned, validated JSON schema and cannot downgrade
  destructive actions to low risk.
- Existing-file overwrites require confirmation, and writes use atomic replace.
- Filesystem paths are validated before snapshots or execution; plans without
  explicit `allowed_roots` are refused.
- Snapshot restore validates manifests and backup paths, deduplicates nested
  paths, and enforces a configurable 512 MB default capacity limit.
- Code-quality pass to meet delivery standards: `ruff` lint is clean and `mypy`
  reports **0 type errors** across all source files.
- Hardened the planning engine's parsing of Claude responses: the code now
  narrows response content to `TextBlock` before reading `.text`, instead of
  assuming the first content block is text (fixes 11 mypy `union-attr` errors and
  avoids a crash if the response leads with a non-text block).

### Added
- `crystal-mind apply` for reviewing and executing saved plans without another
  model call, plus `--dry-run`, `--yes`, `--plan-out`, `doctor`, and `--version`.
- Machine-readable scan output and configurable scan file limits.
- Production safety tests for plan round trips, risk promotion, dry runs,
  overwrite confirmation, offline apply, and tampered snapshot rejection.
- Offline test suite for the content extractor (`tests/test_extractor.py`):
  text/docx/pdf extraction, unknown formats, truncation, and error paths.
  Extractor coverage 33% → 80%; overall coverage 59% → 62%; 17 → 24 offline tests.
- `mypy` configuration in `pyproject.toml` (ignore-missing-imports for the
  untyped third-party modules `fitz` and `crystal_shield`).
- Continuous integration (`.github/workflows/crystal-mind-ci.yml`) running
  ruff, mypy, and the offline test suite on every change to `crystal-mind/`.

## [0.1.0] — Alpha

- Initial release: the 3-question interview → scan → plan → execute pipeline,
  with data-preserving execution (high-risk actions confirmed), snapshot/rollback,
  and an auditable change trail.
