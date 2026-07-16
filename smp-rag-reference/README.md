# SMP RAG Reference

A clean-room, dependency-light reference for an internal self-service knowledge assistant. It uses SQLite FTS5, document-level ACLs, citation-labelled context and basic indirect-prompt-injection blocking.

Detailed security architecture, threat model and evaluation guidance: [`docs/`](docs/README.md).

```bash
pip install -e ".[dev]"
pytest -q
```

This project contains no Momenta source code, data, prompts, taxonomy or architecture. It does not claim the production metrics stated in the author's CV. Before production, add authenticated identity, database row-level security, an embedding/reranking service, distributed rate limiting, audit retention and a reviewed LLM gateway.

MIT License.
