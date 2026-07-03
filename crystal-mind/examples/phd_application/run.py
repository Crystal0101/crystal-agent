"""
crystal-mind — PhD Application Example

This script shows how to use crystal-mind to organize and improve
PhD application materials. It scans the sample_data/ directory,
builds a profile, generates a plan, and executes it.

Usage:
    export ANTHROPIC_API_KEY=sk-ant-...
    python run.py

    # Or with your own data:
    python run.py --roots /path/to/your/files --goal "Organize my research files"
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import click

# Allow running directly from this directory without installing
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from crystal_mind.collector.scanner import scan
from crystal_mind.executor.runner import execute
from crystal_mind.planner.engine import generate
from crystal_mind.profiler.builder import build
from crystal_mind.profiler.types import UserIntent


DEFAULT_WHO = (
    "PhD applicant in ML/AI. "
    "Research focus: trustworthy ML for medical imaging — "
    "federated learning, calibration, domain generalization. "
    "Currently preparing application materials and running experiments."
)

DEFAULT_GOAL = (
    "Review my current materials. "
    "Create a clear directory structure for application documents. "
    "Generate an ACTION_ITEMS.md listing concrete next steps "
    "based on what's incomplete or missing."
)


@click.command()
@click.option(
    "--roots",
    multiple=True,
    type=click.Path(exists=True),
    default=None,
    help="Directories to scan. Defaults to sample_data/ next to this script.",
)
@click.option("--goal", default=None, help="Override the default goal.")
@click.option("--who", default=None, help="Override the default user description.")
@click.option(
    "--model",
    default="claude-haiku-4-5-20251001",
    show_default=True,
    help="Claude model to use. Haiku is fast and cheap for demos.",
)
@click.option("--dry-run", is_flag=True, help="Print the plan but do not execute.")
def main(roots: tuple, goal: str | None, who: str | None, model: str, dry_run: bool):
    """Run the crystal-mind PhD application example."""
    if not os.environ.get("ANTHROPIC_API_KEY"):
        click.echo("Error: ANTHROPIC_API_KEY is not set.", err=True)
        click.echo("  export ANTHROPIC_API_KEY=sk-ant-...", err=True)
        raise SystemExit(1)

    data_roots = [Path(r) for r in roots] if roots else [Path(__file__).parent / "sample_data"]

    intent = UserIntent(
        who=who or DEFAULT_WHO,
        data_roots=data_roots,
        goal=goal or DEFAULT_GOAL,
    )

    click.echo(f"\nScanning {len(intent.data_roots)} director{'y' if len(intent.data_roots) == 1 else 'ies'}...")
    scans = [scan(root) for root in intent.data_roots]
    for s in scans:
        click.echo(f"  {s.summary()}")

    click.echo("\nBuilding profile...")
    profile = build(intent, scans)
    click.echo(f"  {len(profile.key_files)} key files selected, context = {len(profile.to_context_str())} chars")

    click.echo(f"\nGenerating plan via {model}...")
    plan = generate(profile, model=model)

    if dry_run:
        click.echo("\n[Dry run — plan not executed]\n")
        click.echo(f"Reasoning: {plan.reasoning}\n")
        for i, a in enumerate(plan.actions, 1):
            risk = "⚠ HIGH" if a.needs_confirm else "  low"
            click.echo(f"  [{i:02d}] {risk}  {a.type.value:12s}  {a.description}")
        return

    log = execute(plan, log_path=Path(".crystal-mind/run.log"))
    click.echo(f"\nDone. {sum(1 for a in plan.actions if a.done)}/{len(plan.actions)} actions executed.")


if __name__ == "__main__":
    main()
