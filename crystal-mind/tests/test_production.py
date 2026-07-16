from __future__ import annotations

import json
from pathlib import Path

import pytest
from click.testing import CliRunner

from crystal_mind.cli import main
from crystal_mind.executor.runner import execute
from crystal_mind.executor.snapshot import restore_snapshot, take_snapshot
from crystal_mind.planner.plan import Action, ActionType, Plan, Risk


@pytest.mark.offline
def test_plan_round_trip_and_forces_destructive_risk(tmp_path: Path):
    raw = {
        "goal": "clean",
        "allowed_roots": [str(tmp_path)],
        "actions": [{
            "type": "delete",
            "description": "delete old file",
            "risk": "low",
            "params": {"path": str(tmp_path / "old.txt")},
        }],
    }
    plan = Plan.from_dict(raw)
    assert plan.actions[0].risk is Risk.HIGH
    path = plan.save(tmp_path / "plan.json")
    assert Plan.load(path).to_dict() == plan.to_dict()


@pytest.mark.offline
def test_dry_run_makes_no_changes_and_no_snapshot(tmp_path: Path):
    target = tmp_path / "new.txt"
    plan = Plan(
        goal="preview",
        actions=[Action(ActionType.WRITE_FILE, "write", {"path": str(target), "content": "x"})],
        allowed_roots=[str(tmp_path)],
    )
    log_path = tmp_path / "state" / "run.log"
    log = execute(plan, log_path=log_path, dry_run=True)
    assert not target.exists()
    assert not (log_path.parent / "snapshots").exists()
    assert any("DRY RUN" in line for line in log)


@pytest.mark.offline
def test_existing_file_overwrite_requires_confirmation(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    target = tmp_path / "existing.txt"
    target.write_text("original")
    plan = Plan(
        goal="overwrite",
        actions=[Action(ActionType.WRITE_FILE, "replace", {"path": str(target), "content": "new"})],
        allowed_roots=[str(tmp_path)],
    )
    monkeypatch.setattr("click.confirm", lambda *args, **kwargs: False)
    execute(plan)
    assert target.read_text() == "original"
    assert plan.actions[0].result == "SKIPPED by user"


@pytest.mark.offline
def test_tampered_snapshot_cannot_restore_outside_root(tmp_path: Path):
    root = tmp_path / "root"
    root.mkdir()
    target = root / "file.txt"
    target.write_text("original")
    plan = Plan(
        goal="safe",
        actions=[Action(ActionType.WRITE_FILE, "replace", {"path": str(target), "content": "new"})],
        allowed_roots=[str(root)],
    )
    snapshots = tmp_path / "snapshots"
    snapshot = take_snapshot(plan, snapshots)
    manifest_path = snapshots / snapshot.snapshot_id / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    manifest["entries"][0]["path"] = str(tmp_path / "outside.txt")
    manifest_path.write_text(json.dumps(manifest))
    with pytest.raises(ValueError, match="outside allowed_roots"):
        restore_snapshot(snapshot.snapshot_id, snapshots)


@pytest.mark.offline
def test_apply_command_supports_offline_dry_run(tmp_path: Path):
    target = tmp_path / "result.txt"
    plan = Plan(
        goal="apply",
        actions=[Action(ActionType.WRITE_FILE, "write", {"path": str(target), "content": "ok"})],
        allowed_roots=[str(tmp_path)],
    )
    plan_path = plan.save(tmp_path / "plan.json")
    result = CliRunner().invoke(main, ["apply", str(plan_path), "--dry-run", "--log", str(tmp_path / "run.log")])
    assert result.exit_code == 0, result.output
    assert "No changes were made" in result.output
    assert not target.exists()
