from __future__ import annotations

import argparse
import json
from pathlib import Path

from .core import Config, run


def main() -> None:
    parser = argparse.ArgumentParser(description="Run a DP-FedAvg medical prediction experiment")
    parser.add_argument("--rounds", type=int, default=20)
    parser.add_argument("--clients", type=int, default=5)
    parser.add_argument("--epsilon", type=float, default=5.0)
    parser.add_argument("--no-dp", action="store_true")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--output", type=Path, default=Path("results/result.json"))
    args = parser.parse_args()
    result = run(Config(clients=args.clients, rounds=args.rounds, epsilon=None if args.no_dp else args.epsilon, seed=args.seed))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result["final"], indent=2))
    print(f"Saved: {args.output}")
