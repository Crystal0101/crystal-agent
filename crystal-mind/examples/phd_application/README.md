# PhD Application Example

This example shows how to use crystal-mind to organize PhD application materials and generate a concrete action plan.

## What it does

1. Scans `sample_data/` (a CV, research statement draft, and project notes)
2. Sends the content to Claude with context about who you are and what you want
3. Gets back a structured action plan (create dirs, write summaries, flag gaps)
4. Executes the plan automatically

## Quick start

```bash
# From the crystal-mind repo root:
export ANTHROPIC_API_KEY=sk-ant-...

# Preview the plan without executing
python examples/phd_application/run.py --dry-run

# Run for real
python examples/phd_application/run.py
```

## Use your own files

```bash
python examples/phd_application/run.py \
  --roots /path/to/your/research \
  --roots /path/to/your/application_docs \
  --goal "Create an ACTION_ITEMS.md listing what I need to finish before applying"
```

## Sample data

The `sample_data/` directory contains three demo files:

| File | What it represents |
|---|---|
| `cv.md` | Academic CV with publications and research experience |
| `research_statement_draft.md` | Draft research statement with TODO notes |
| `project_notes.md` | Scattered notes about ongoing experiments |

## Expected output

crystal-mind will:
- Read all three files
- Identify incomplete sections (the TODO items in the research statement)
- Create an `ACTION_ITEMS.md` with ranked next steps
- Possibly create a directory structure suggestion

Execution log is saved to `.crystal-mind/run.log`.
