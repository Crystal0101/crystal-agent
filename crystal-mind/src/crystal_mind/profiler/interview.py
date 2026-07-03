"""
Three-question interview — the only thing the user needs to answer.
"""

from __future__ import annotations

from pathlib import Path

import click

from .types import UserIntent


def run_interview(
    prefill_who: str | None = None,
    prefill_roots: list[str] | None = None,
    prefill_goal: str | None = None,
) -> UserIntent:
    """Interactive 3-question interview. Prefill args skip individual questions."""
    click.echo("\n" + "─" * 60)
    click.echo("  crystal-mind  ·  Personal AI Planning System")
    click.echo("─" * 60)
    click.echo("  Answer 3 questions. crystal-mind handles the rest.\n")

    # ① Who are you?
    if prefill_who:
        who = prefill_who
        click.echo(f"① Who are you?  [pre-filled: {who[:60]}]")
    else:
        who = click.prompt(
            "① Who are you?\n"
            "  (background, current role, key skills, what stage of life/work)\n"
            " >"
        ).strip()

    # ② What data do you have?
    if prefill_roots:
        data_roots = [Path(p).expanduser().resolve() for p in prefill_roots
                      if Path(p).expanduser().resolve().exists()]
        click.echo(f"② Data paths:   [pre-filled: {', '.join(str(r) for r in data_roots)}]")
    else:
        raw_paths = click.prompt(
            "\n② What data do you have?\n"
            "  (comma-separated directory paths to scan)\n"
            " >"
        ).strip()
        data_roots = []
        for p in raw_paths.split(","):
            resolved = Path(p.strip()).expanduser().resolve()
            if resolved.exists():
                data_roots.append(resolved)
            else:
                click.echo(f"  ⚠ Path not found, skipping: {p.strip()}")

    # ③ What do you want?
    if prefill_goal:
        goal = prefill_goal
        click.echo(f"③ Goal:         [pre-filled: {goal[:60]}]")
    else:
        goal = click.prompt(
            "\n③ What do you want to achieve?\n"
            "  (be specific: a deadline, an outcome, a problem to solve)\n"
            " >"
        ).strip()

    click.echo("\n  Got it. Scanning and planning now...\n")
    return UserIntent(who=who, data_roots=data_roots, goal=goal)
