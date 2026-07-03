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

---

## Part of the crystal-agent ecosystem

| Package | Role in crystal-mind |
|---|---|
| `crystal-shield` | Protects the planning agent from injection attacks in user data |
| `crystal-mcp` | Tool execution layer for file operations |
| `crystal-eval` | Measures planning quality and execution accuracy |
