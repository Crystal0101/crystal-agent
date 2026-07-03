"""
crystal-mind CLI — entry point.

Usage:
    crystal-mind run [--roots PATH...] [--goal TEXT] [--log PATH]
    crystal-mind scan PATH
"""

from __future__ import annotations

import os
from pathlib import Path

import click
from rich.console import Console

from .collector.scanner import scan
from .profiler.interview import run_interview
from .profiler.builder import build
from .planner.engine import generate
from .executor.runner import execute
from .executor.snapshot import list_snapshots, restore_snapshot

console = Console()


@click.group()
def main():
    """crystal-mind — your personal AI planning system."""


@main.command()
@click.option("--roots", multiple=True, type=click.Path(exists=True), metavar="PATH",
              help="Directories to scan (repeatable). Skips interview question ②.")
@click.option("--goal", default=None, metavar="TEXT",
              help="Goal description. Skips interview question ③.")
@click.option("--who", default=None, metavar="TEXT",
              help="Who you are. Skips interview question ①.")
@click.option("--log", default=".crystal-mind/run.log", help="Path to write execution log")
@click.option("--model", default="claude-sonnet-4-6", show_default=True,
              help="Claude model to use for planning.")
def run(roots: tuple, goal: str | None, who: str | None, log: str, model: str):
    """Full pipeline: interview → scan → plan → execute.

    Pass --roots / --goal / --who to skip the interactive interview.
    """
    if not os.environ.get("ANTHROPIC_API_KEY"):
        click.echo("Error: ANTHROPIC_API_KEY environment variable not set.", err=True)
        raise SystemExit(1)

    # Step 1: Interview (only ask questions not already answered via flags)
    if roots and goal and who:
        from .profiler.types import UserIntent
        intent = UserIntent(
            who=who,
            data_roots=[Path(r) for r in roots],
            goal=goal,
        )
    else:
        intent = run_interview(
            prefill_who=who,
            prefill_roots=list(roots) if roots else None,
            prefill_goal=goal,
        )

    # Step 2: Scan
    console.print("  Scanning data...", style="dim")
    scans = [scan(root) for root in intent.data_roots]
    for s in scans:
        console.print(f"  {s.summary()}", style="dim")

    # Step 3: Build profile
    console.print("\n  Building your profile...", style="dim")
    profile = build(intent, scans)

    # Step 4: Generate plan
    console.print(f"  Generating plan (model: {model})...\n", style="dim")
    plan = generate(profile, model=model)

    # Step 5: Execute
    execute(plan, log_path=Path(log))

    console.print("\n  Done.", style="bold green")


@main.command()
@click.argument("path")
def scan_cmd(path: str):
    """Scan a directory and print a summary."""
    result = scan(path)
    console.print(result.summary())


@main.command("snapshots")
@click.option("--log", default=".crystal-mind/run.log", help="Log path (used to find snapshots dir)")
def snapshots_cmd(log: str):
    """List all saved snapshots available for rollback."""
    snapshots_dir = Path(log).parent / "snapshots"
    snaps = list_snapshots(snapshots_dir)

    if not snaps:
        console.print("No snapshots found.", style="dim")
        console.print(f"  (looked in: {snapshots_dir})", style="dim")
        return

    from rich.table import Table
    table = Table(title="Available Snapshots", show_header=True, header_style="bold")
    table.add_column("ID", style="cyan")
    table.add_column("Timestamp")
    table.add_column("Paths backed up", justify="right")
    table.add_column("Goal")

    for s in snaps:
        table.add_row(
            s.snapshot_id,
            s.timestamp[:19],
            str(len(s.entries)),
            s.goal[:60],
        )

    console.print(table)
    console.print(f"\nTo rollback: crystal-mind rollback <SNAPSHOT_ID>", style="dim")


@main.command("rollback")
@click.argument("snapshot_id")
@click.option("--log", default=".crystal-mind/run.log", help="Log path (used to find snapshots dir)")
@click.option("--yes", is_flag=True, default=False, help="Skip confirmation prompt")
def rollback_cmd(snapshot_id: str, log: str, yes: bool):
    """Restore filesystem state to before SNAPSHOT_ID ran.

    Files created by the plan are deleted.
    Files that existed before are restored from the backup.
    """
    snapshots_dir = Path(log).parent / "snapshots"

    snaps = list_snapshots(snapshots_dir)
    target = next((s for s in snaps if s.snapshot_id == snapshot_id), None)
    if target is None:
        click.echo(f"Error: snapshot '{snapshot_id}' not found.", err=True)
        click.echo("Run 'crystal-mind snapshots' to see available IDs.", err=True)
        raise SystemExit(1)

    console.print(f"\nSnapshot: [cyan]{target.snapshot_id}[/cyan]")
    console.print(f"Goal:     {target.goal}")
    console.print(f"Paths:    {len(target.entries)} entries to restore\n")

    if not yes and not click.confirm("Proceed with rollback?", default=False):
        click.echo("Cancelled.")
        return

    results = restore_snapshot(snapshot_id, snapshots_dir)
    for r in results:
        style = "yellow" if r.startswith("WARNING") else "green"
        console.print(f"  {r}", style=style)

    console.print(f"\nRollback complete: {len(results)} paths processed.", style="bold green")


# alias for cleaner CLI
main.add_command(scan_cmd, name="scan")
