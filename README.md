# crystal-agent

> A monorepo of model-independent tools for building, securing, and evaluating LLM agents.

---

## Projects

| Package | Description | Install |
|---------|-------------|---------|
| [crystal-shield](./crystal-shield) | Runtime prompt injection detection & policy enforcement | `pip install crystal-shield` |
| [crystal-mcp](./crystal-mcp) | Zero-boilerplate MCP server toolkit | `pip install crystal-mcp` |
| [crystal-eval](./crystal-eval) | Agent capability & security evaluation framework | `pip install crystal-eval` |
| [crystal-mind](./crystal-mind) | Personal AI planning with scanning, execution and rollback | `pip install crystal-mind` |
| [ai-tools](./ai-tools) | Next.js collection of practical AI workflows | `npm ci --prefix ai-tools` |
| [ai-killer](./ai-killer) | Real-time multiplayer social deduction game | `npm ci --prefix ai-killer` |

## Research portfolio

These directories are the public, code-oriented companions to ongoing research. They expose reusable implementations, protocols and evidence boundaries without publishing private data, model weights, manuscript drafts or unreviewed experiment artifacts.

| Project | Research focus | Public scope |
|---------|----------------|--------------|
| [dermacal](./dermacal) | Published calibration study under image-quality degradation | Paper-linked implementation, experiments and aggregate evidence |
| [adaptive-kdfa](./adaptive-kdfa) | Cross-architecture knowledge transfer in heterogeneous federated learning | Tested KD/feature-alignment objectives and communication accounting |
| [dpfl-medical-ai](./dpfl-medical-ai) | Differentially private federated medical prediction | Reproducible public-data reference implementation |
| [quality-conformal](./quality-conformal) | Quality-conditional conformal selective prediction | Current paper-linked code, protocols, tests and aggregate evidence |
| [federated-calibration](./federated-calibration) | Worst-institution reliability under federated heterogeneity | Confirmatory protocol and evidence boundaries |
| [distributed-evidence-audit](./distributed-evidence-audit) | Auditability of efficiency evidence in distributed optimisation | Review protocol, required evidence fields and reproducibility boundaries |

The research directories are not medical devices and do not claim clinical validation. Each README distinguishes reusable public code from local experiments and work-in-progress manuscripts.

## Philosophy

- **Model-independent** — works with any LLM provider (OpenAI, Anthropic, local models)
- **Zero mandatory dependencies** — each package is standalone, import only what you need
- **Security-first** — built with the assumption that agent inputs are untrusted

## Quick Start

```bash
pip install crystal-shield crystal-mcp crystal-eval
```

See each package's README for usage examples.

## Development

Python 3.10+ and Node.js 20+ are recommended.

```bash
python3 -m venv .venv
.venv/bin/pip install -e "crystal-shield[dev]" -e "crystal-mcp[dev]" -e "crystal-eval[dev]" -e "crystal-mind[dev]"
.venv/bin/pytest -q crystal-shield/tests crystal-mcp/tests crystal-eval/tests crystal-mind/tests -m "not online"
npm ci --prefix ai-tools && npm run build --prefix ai-tools
npm ci --prefix ai-killer && npm test --prefix ai-killer -- --runInBand && npm run build --prefix ai-killer
```

Copy `.env.example` to the relevant app's `.env.local`. Never commit API keys.

## Production notes

- `ai-tools` requires `ANTHROPIC_API_KEY`; its API validates input, caps request size/tokens and applies a per-instance rate limit. Use a gateway or shared rate-limit store when horizontally scaling.
- `ai-killer` keeps rooms in process memory. A single instance is suitable for an initial deployment; multi-instance deployment requires a shared Socket.IO adapter and persistent room store.
- Run the test, type-check, lint, build and dependency-audit jobs in `.github/workflows` before release.

## License

MIT
