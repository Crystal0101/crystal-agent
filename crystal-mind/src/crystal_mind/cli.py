"""
crystal-mind CLI — entry point.

Usage:
    crystal-mind run [--roots PATH...] [--goal TEXT] [--log PATH]
    crystal-mind scan PATH
"""

from __future__ import annotations

import os
import json
from pathlib import Path

import click
from rich.console import Console

from .collector.scanner import scan
from .profiler.interview import run_interview
from .profiler.builder import build
from .planner.engine import generate
from .planner.plan import Plan
from .executor.runner import execute
from .executor.snapshot import list_snapshots, restore_snapshot
from . import __version__

console = Console()


@click.group()
@click.version_option(__version__)
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
@click.option("--model", default=lambda: os.environ.get("CRYSTAL_MIND_MODEL", "claude-sonnet-4-6"),
              show_default="claude-sonnet-4-6 or CRYSTAL_MIND_MODEL",
              help="Claude model to use for planning.")
@click.option("--plan-out", default=".crystal-mind/plan.json", show_default=True,
              help="Save the validated generated plan as JSON.")
@click.option("--dry-run", is_flag=True, help="Generate and validate the plan without changing files.")
@click.option("--yes", is_flag=True, help="Approve all high-risk actions (automation only).")
def run(
    roots: tuple[str, ...], goal: str | None, who: str | None, log: str,
    model: str, plan_out: str, dry_run: bool, yes: bool,
):
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
    if not intent.data_roots:
        raise click.UsageError("At least one existing data root is required")
    scans = [scan(root) for root in intent.data_roots]
    for s in scans:
        console.print(f"  {s.summary()}", style="dim")

    # Step 3: Build profile
    console.print("\n  Building your profile...", style="dim")
    profile = build(intent, scans)

    # Step 4: Generate plan
    console.print(f"  Generating plan (model: {model})...\n", style="dim")
    plan = generate(profile, model=model)
    saved_plan = plan.save(plan_out)
    console.print(f"  Plan saved: {saved_plan}", style="dim")

    # Step 5: Execute
    execute(plan, log_path=Path(log), dry_run=dry_run, assume_yes=yes)

    console.print("\n  Done.", style="bold green")


@main.command()
@click.argument("path", type=click.Path(exists=True, file_okay=False, path_type=Path))
@click.option("--max-files", default=10_000, show_default=True, type=click.IntRange(min=1))
@click.option("--json-output", is_flag=True, help="Print machine-readable JSON.")
def scan_cmd(path: Path, max_files: int, json_output: bool):
    """Scan a directory and print a summary."""
    result = scan(path, max_files=max_files)
    if json_output:
        click.echo(json.dumps({
            "root": str(result.root),
            "files": len(result.files),
            "directories": result.dir_count,
            "total_bytes": result.total_bytes,
            "extensions": {key or "no-ext": len(value) for key, value in result.by_extension().items()},
        }, ensure_ascii=False, indent=2))
    else:
        console.print(result.summary())


@main.command("doctor")
def doctor_cmd():
    """Check whether crystal-mind is ready to run."""
    checks = [
        ("ANTHROPIC_API_KEY", bool(os.environ.get("ANTHROPIC_API_KEY")), "required for plan generation"),
        ("State directory", _is_writable(Path(".crystal-mind")), "must be writable"),
    ]
    failed = False
    for name, ok, detail in checks:
        failed = failed or not ok
        console.print(f"  {'✓' if ok else '✗'} {name}: {detail}", style="green" if ok else "red")
    if failed:
        raise click.ClickException("Environment is not ready; fix the failed checks above")


def _is_writable(path: Path) -> bool:
    try:
        path.mkdir(parents=True, exist_ok=True)
        probe = path / ".write-test"
        probe.write_text("ok", encoding="utf-8")
        probe.unlink()
        return True
    except OSError:
        return False


@main.command("apply")
@click.argument("plan_path", type=click.Path(exists=True, dir_okay=False, path_type=Path))
@click.option("--log", default=".crystal-mind/run.log", show_default=True)
@click.option("--dry-run", is_flag=True, help="Validate and preview without changing files.")
@click.option("--yes", is_flag=True, help="Approve all high-risk actions (automation only).")
def apply_cmd(plan_path: Path, log: str, dry_run: bool, yes: bool):
    """Validate and execute a previously generated PLAN_PATH."""
    try:
        plan = Plan.load(plan_path)
        execute(plan, log_path=Path(log), dry_run=dry_run, assume_yes=yes)
    except (OSError, ValueError) as exc:
        raise click.ClickException(str(exc)) from exc


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
    console.print("\nTo rollback: crystal-mind rollback <SNAPSHOT_ID>", style="dim")


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
