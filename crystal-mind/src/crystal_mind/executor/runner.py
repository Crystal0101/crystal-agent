"""
Plan executor — runs actions sequentially.
Low-risk actions execute automatically.
High-risk actions pause for a single y/n confirmation.
All results are logged.
"""

from __future__ import annotations

from datetime import datetime
from pathlib import Path

import click
from rich.console import Console
from rich.table import Table

from ..planner.plan import Action, ActionType, Plan
from . import actions as ops
from .snapshot import take_snapshot

console = Console()


def execute(
    plan: Plan,
    log_path: Path | None = None,
    snapshots_dir: Path | None = None,
) -> list[str]:
    log: list[str] = []
    log.append(f"crystal-mind execution log — {datetime.now().isoformat()}")
    log.append(f"Goal: {plan.goal}\n")

    # Derive snapshots_dir from log_path if not given explicitly
    if snapshots_dir is None and log_path is not None:
        snapshots_dir = log_path.parent / "snapshots"

    # Take pre-execution snapshot so the user can rollback if needed
    if snapshots_dir is not None:
        snapshot = take_snapshot(plan, snapshots_dir)
        log.append(f"Snapshot: {snapshot.snapshot_id}  ({len(snapshot.entries)} paths backed up)")
        console.print(
            f"  Snapshot saved: {snapshot.snapshot_id}  "
            f"(rollback with: crystal-mind rollback {snapshot.snapshot_id})",
            style="dim",
        )

    _print_plan_overview(plan)

    for i, action in enumerate(plan.actions, 1):
        tag = f"[{i}/{len(plan.actions)}]"

        if action.needs_confirm:
            click.echo(f"\n⚠  {tag} HIGH RISK: {action.description}")
            if not click.confirm("    Proceed?", default=False):
                action.result = "SKIPPED by user"
                log.append(f"{tag} SKIPPED: {action.description}")
                continue

        result = _dispatch(action)
        action.done = True
        action.result = result

        prefix = "✓" if "SKIP" not in result else "–"
        console.print(f"  {prefix} {tag} {result}", style="green" if prefix == "✓" else "dim")
        log.append(f"{tag} {result}")

    log.append(f"\nCompleted {sum(1 for a in plan.actions if a.done)}/{len(plan.actions)} actions.")

    if log_path:
        log_path.parent.mkdir(parents=True, exist_ok=True)
        log_path.write_text("\n".join(log), encoding="utf-8")
        console.print(f"\n  Log saved: {log_path}", style="dim")

    return log


def _dispatch(action: Action) -> str:
    p = action.params
    match action.type:
        case ActionType.CREATE_DIR:
            return ops.create_dir(p["path"])
        case ActionType.MOVE_FILE:
            return ops.move_file(p["src"], p["dst"])
        case ActionType.WRITE_FILE | ActionType.REPORT:
            return ops.write_file(p["path"], p.get("content", ""))
        case ActionType.ARCHIVE:
            return ops.archive(p["src"], p["archive_dir"])
        case ActionType.DELETE:
            return ops.delete(p["path"])
        case ActionType.NOTE | ActionType.EXTERNAL:
            return f"NOTE: {p.get('message', action.description)}"
        case _:
            return f"Unknown action type: {action.type}"


def _print_plan_overview(plan: Plan) -> None:
    table = Table(title=f"Plan: {plan.goal[:80]}", show_header=True, header_style="bold")
    table.add_column("#", width=4)
    table.add_column("Risk", width=6)
    table.add_column("Action")

    for i, a in enumerate(plan.actions, 1):
        risk_style = "red" if a.needs_confirm else "green"
        table.add_row(str(i), f"[{risk_style}]{a.risk.value}[/{risk_style}]", a.description)

    console.print(table)
    console.print(f"\nReasoning: {plan.reasoning}\n")
