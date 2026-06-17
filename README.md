# crystal-agent

> A monorepo of model-independent tools for building, securing, and evaluating LLM agents.

---

## Projects

| Package | Description | Install |
|---------|-------------|---------|
| [crystal-shield](./crystal-shield) | Runtime prompt injection detection & policy enforcement | `pip install crystal-shield` |
| [crystal-mcp](./crystal-mcp) | Zero-boilerplate MCP server toolkit | `pip install crystal-mcp` |
| [crystal-eval](./crystal-eval) | Agent capability & security evaluation framework | `pip install crystal-eval` |

## Philosophy

- **Model-independent** — works with any LLM provider (OpenAI, Anthropic, local models)
- **Zero mandatory dependencies** — each package is standalone, import only what you need
- **Security-first** — built with the assumption that agent inputs are untrusted

## Quick Start

```bash
pip install crystal-shield crystal-mcp crystal-eval
```

See each package's README for usage examples.

## License

MIT
