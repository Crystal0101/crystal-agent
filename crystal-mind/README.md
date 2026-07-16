# crystal-mind

> Your personal AI chief of staff. Answer 3 questions. It handles the rest.

crystal-mind scans your data, understands your context, and autonomously executes a plan — no step-by-step hand-holding required.

---

## The 3 Questions

```
① Who are you?        background, current role, key skills
② What do you have?   directories to scan
③ What do you want?   your goal
```

That's all. crystal-mind figures out the rest.

---

## Install

```bash
pip install crystal-mind
export ANTHROPIC_API_KEY=sk-...
```

## Usage

```bash
crystal-mind run
```

Runs the full pipeline: interview → scan → plan → execute. High-risk operations (deletions) are the only things that pause for confirmation. Everything else executes automatically and is logged.

```bash
crystal-mind scan /path/to/data
```

Scan only — shows a summary of what was found without making any changes.

### Safe production workflow

Generate a plan, save it, and preview every action without modifying files:

```bash
crystal-mind run \
  --who "PhD researcher" \
  --roots ~/research \
  --goal "Organize the literature review" \
  --plan-out .crystal-mind/plan.json \
  --dry-run
```

Review `.crystal-mind/plan.json`, then apply it without another model call:

```bash
crystal-mind apply .crystal-mind/plan.json --dry-run
crystal-mind apply .crystal-mind/plan.json
```

Use `--yes` only in controlled automation; it approves overwrites, deletes, and
other high-risk actions. Run `crystal-mind doctor` to validate the environment.

### Recovery

Every real execution creates a bounded pre-change snapshot after validating all
paths against `allowed_roots`:

```bash
crystal-mind snapshots
crystal-mind rollback 20260716T120000000000
```

Snapshots default to a 512 MB limit. Set `CRYSTAL_MIND_MAX_SNAPSHOT_BYTES` to a
different byte limit when you have reviewed the storage impact.

---

## How It Works

```
User answers 3 questions
        ↓
  Scan data directories
  (file tree, content previews)
        ↓
  Build user profile
  (who + what you have + goal)
        ↓
  Claude generates action plan
  (structured JSON: action type, params, risk level)
        ↓
  Execute plan
  LOW RISK  → auto-execute (create dirs, move files, write indexes)
  HIGH RISK → single y/n prompt (delete, external)
        ↓
  Log everything (reversible audit trail)
```

---

## Design Principles

- **Minimal friction**: 3 questions is all the input needed
- **Data-preserving**: never deletes without explicit confirmation
- **Local-first**: your data stays on your machine
- **Auditable**: every action is logged with a full change trail
- **Model-independent**: swap Claude for any LLM via the engine layer

> Current release note: the CLI ships with an Anthropic engine. The planning
> interface is isolated for future providers, but other providers are not yet
> bundled.

## Configuration

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Required for generating plans |
| `CRYSTAL_MIND_MODEL` | Optional Anthropic model override |
| `CRYSTAL_MIND_MAX_SNAPSHOT_BYTES` | Maximum snapshot size; defaults to 512 MB |

The scanner ignores symlinks and common generated directories, limits a scan to
10,000 files by default, and sanitizes sampled file contents before sending them
to the planner. Install `crystal-mind[security]` when `crystal-shield` is
available for the full detector; standalone installs retain a conservative
built-in injection filter.

---

## Part of the crystal-agent ecosystem

| Package | Role in crystal-mind |
|---|---|
| `crystal-shield` | Protects the planning agent from injection attacks in user data |
| `crystal-mcp` | Tool execution layer for file operations |
| `crystal-eval` | Measures planning quality and execution accuracy |
