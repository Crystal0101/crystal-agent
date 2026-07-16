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
    *,
    dry_run: bool = False,
    assume_yes: bool = False,
) -> list[str]:
    log: list[str] = []
    log.append(f"crystal-mind execution log — {datetime.now().isoformat()}")
    log.append(f"Goal: {plan.goal}\n")

    # Derive snapshots_dir from log_path if not given explicitly
    if snapshots_dir is None and log_path is not None:
        snapshots_dir = log_path.parent / "snapshots"

    allowed_roots = _resolve_roots(plan.allowed_roots)
    if not allowed_roots:
        raise ValueError("Refusing to execute a plan without allowed_roots")

    validation_errors = validate_plan(plan, allowed_roots)
    if validation_errors:
        details = "\n".join(f"- {message}" for message in validation_errors)
        raise ValueError(f"Plan validation failed:\n{details}")

    _promote_overwrites(plan)
    _print_plan_overview(plan)

    if dry_run:
        log.append("DRY RUN: no filesystem changes were made.")
        for index, action in enumerate(plan.actions, 1):
            log.append(f"[{index}/{len(plan.actions)}] WOULD {action.type.value}: {action.description}")
        _write_log(log, log_path)
        console.print("  Dry run complete. No changes were made.", style="bold cyan")
        return log

    # Snapshot only after every path has passed the sandbox and schema checks.
    if snapshots_dir is not None:
        snapshot = take_snapshot(plan, snapshots_dir, allowed_roots=allowed_roots)
        log.append(f"Snapshot: {snapshot.snapshot_id}  ({len(snapshot.entries)} paths backed up)")
        console.print(
            f"  Snapshot saved: {snapshot.snapshot_id}  "
            f"(rollback with: crystal-mind rollback {snapshot.snapshot_id})",
            style="dim",
        )

    for i, action in enumerate(plan.actions, 1):
        tag = f"[{i}/{len(plan.actions)}]"

        if action.needs_confirm:
            click.echo(f"\n⚠  {tag} HIGH RISK: {action.description}")
            if not assume_yes and not click.confirm("    Proceed?", default=False):
                action.result = "SKIPPED by user"
                log.append(f"{tag} SKIPPED: {action.description}")
                continue

        try:
            result = _dispatch(action)
            action.done = True
            action.result = result
        except (OSError, KeyError, TypeError, ValueError) as exc:
            result = f"ERROR: {type(exc).__name__}: {exc}"
            action.result = result

        prefix = "✗" if result.startswith("ERROR") else ("–" if "SKIP" in result else "✓")
        style = "bold red" if prefix == "✗" else ("dim" if prefix == "–" else "green")
        console.print(f"  {prefix} {tag} {result}", style=style)
        log.append(f"{tag} {result}")

    log.append(f"\nCompleted {sum(1 for a in plan.actions if a.done)}/{len(plan.actions)} actions.")

    _write_log(log, log_path)

    return log


def _resolve_roots(allowed_roots: list[str]) -> list[Path]:
    return [Path(r).expanduser().resolve(strict=True) for r in allowed_roots]


def _action_paths(action: Action) -> list[str]:
    """Every filesystem path an action would touch, by ActionType."""
    p = action.params
    match action.type:
        case ActionType.CREATE_DIR | ActionType.WRITE_FILE | ActionType.REPORT | ActionType.DELETE:
            return [p["path"]] if "path" in p else []
        case ActionType.MOVE_FILE:
            return [p[k] for k in ("src", "dst") if k in p]
        case ActionType.ARCHIVE:
            return [p[k] for k in ("src", "archive_dir") if k in p]
        case _:
            return []


def _paths_allowed(action: Action, allowed_roots: list[Path]) -> bool:
    for raw in _action_paths(action):
        try:
            resolved = Path(raw).expanduser().resolve()
        except OSError:
            return False
        if not any(resolved == root or resolved.is_relative_to(root) for root in allowed_roots):
            return False
    return True


_REQUIRED_PARAMS: dict[ActionType, tuple[str, ...]] = {
    ActionType.CREATE_DIR: ("path",),
    ActionType.MOVE_FILE: ("src", "dst"),
    ActionType.WRITE_FILE: ("path", "content"),
    ActionType.REPORT: ("path", "content"),
    ActionType.ARCHIVE: ("src", "archive_dir"),
    ActionType.DELETE: ("path",),
    ActionType.EXTERNAL: ("message",),
    ActionType.NOTE: ("message",),
}


def validate_plan(plan: Plan, allowed_roots: list[Path] | None = None) -> list[str]:
    roots = allowed_roots if allowed_roots is not None else _resolve_roots(plan.allowed_roots)
    errors: list[str] = []
    if not plan.actions:
        errors.append("plan contains no actions")
    if len(plan.actions) > 200:
        errors.append("plan exceeds the 200-action safety limit")
    for index, action in enumerate(plan.actions, 1):
        missing = [key for key in _REQUIRED_PARAMS[action.type] if key not in action.params]
        if missing:
            errors.append(f"action {index} ({action.type.value}) missing params: {', '.join(missing)}")
            continue
        for raw in _action_paths(action):
            if not isinstance(raw, str) or not raw.strip():
                errors.append(f"action {index} contains an invalid path")
        if not _paths_allowed(action, roots):
            errors.append(f"action {index} touches a path outside allowed_roots")
    return errors


def _promote_overwrites(plan: Plan) -> None:
    """Existing file replacement is destructive and always requires approval."""
    for action in plan.actions:
        if action.type in {ActionType.WRITE_FILE, ActionType.REPORT}:
            path = action.params.get("path")
            if isinstance(path, str) and Path(path).expanduser().exists():
                action.risk = action.risk.__class__.HIGH


def _write_log(log: list[str], log_path: Path | None) -> None:
    if log_path:
        log_path.parent.mkdir(parents=True, exist_ok=True)
        log_path.write_text("\n".join(log), encoding="utf-8")
        console.print(f"\n  Log saved: {log_path}", style="dim")


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
