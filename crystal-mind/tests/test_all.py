"""
完整测试套件 — 分两组：
  离线测试（不需要网络/API）：pytest tests/test_all.py -m offline
  在线测试（需要 ANTHROPIC_API_KEY）：pytest tests/test_all.py -m online
"""

import json
import os
import sys
import tempfile
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from crystal_mind.collector.scanner import scan
from crystal_mind.collector.extractor import extract
from crystal_mind.profiler.types import UserIntent
from crystal_mind.profiler.builder import build
from crystal_mind.planner.plan import Action, ActionType, Plan, Risk
from crystal_mind.executor import actions as ops
from crystal_mind.executor.snapshot import take_snapshot, list_snapshots, restore_snapshot


# ── Offline tests ─────────────────────────────────────────────────────────────

@pytest.mark.offline
def test_scanner_basic():
    result = scan(Path(__file__).parent.parent)
    assert result.dir_count >= 1
    assert len(result.files) >= 5
    assert result.total_bytes > 0


@pytest.mark.offline
def test_scanner_skips_pycache():
    result = scan(Path(__file__).parent.parent)
    for f in result.files:
        assert "__pycache__" not in str(f.path)


@pytest.mark.offline
def test_extractor_text():
    p = Path(__file__).parent.parent / "README.md"
    text = extract(p, max_chars=100)
    assert len(text) > 0
    assert "crystal" in text.lower()


@pytest.mark.offline
def test_extractor_unknown_returns_empty():
    p = Path("/nonexistent/file.xyz")
    assert extract(p) == ""


@pytest.mark.offline
def test_profiler_builder():
    intent = UserIntent(
        who="Test user, PhD applicant, ML research",
        data_roots=[Path(__file__).parent.parent],
        goal="Organize research files"
    )
    scans = [scan(r) for r in intent.data_roots]
    profile = build(intent, scans)

    assert profile.who == intent.who
    assert profile.goal == intent.goal
    assert len(profile.key_files) > 0
    ctx = profile.to_context_str()
    assert "USER PROFILE" in ctx
    assert "KEY FILE CONTENTS" in ctx


@pytest.mark.offline
def test_plan_model():
    low  = Action(ActionType.CREATE_DIR, "create", {"path": "/tmp"}, Risk.LOW)
    high = Action(ActionType.DELETE,     "delete", {"path": "/tmp/x"}, Risk.HIGH)
    plan = Plan("test", [low, high], "test reason")

    assert len(plan.low_risk()) == 1
    assert len(plan.high_risk()) == 1
    assert low.needs_confirm is False
    assert high.needs_confirm is True


@pytest.mark.offline
def test_executor_create_dir():
    with tempfile.TemporaryDirectory() as tmp:
        result = ops.create_dir(f"{tmp}/a/b/c")
        assert "Created" in result
        assert Path(f"{tmp}/a/b/c").is_dir()


@pytest.mark.offline
def test_executor_write_file():
    with tempfile.TemporaryDirectory() as tmp:
        result = ops.write_file(f"{tmp}/test.md", "# Hello")
        assert "Written" in result
        assert Path(f"{tmp}/test.md").read_text() == "# Hello"


@pytest.mark.offline
def test_executor_move_file():
    with tempfile.TemporaryDirectory() as tmp:
        ops.write_file(f"{tmp}/src.md", "content")
        result = ops.move_file(f"{tmp}/src.md", f"{tmp}/dst/src.md")
        assert "Moved" in result
        assert Path(f"{tmp}/dst/src.md").exists()
        assert not Path(f"{tmp}/src.md").exists()


@pytest.mark.offline
def test_executor_move_skips_missing():
    with tempfile.TemporaryDirectory() as tmp:
        result = ops.move_file("/nonexistent.md", f"{tmp}/dst.md")
        assert "SKIP" in result


@pytest.mark.offline
def test_executor_archive():
    with tempfile.TemporaryDirectory() as tmp:
        ops.write_file(f"{tmp}/doc.md", "content")
        result = ops.archive(f"{tmp}/doc.md", f"{tmp}/archive")
        assert "Archived" in result
        assert Path(f"{tmp}/archive/doc.md").exists()


@pytest.mark.offline
def test_snapshot_take_and_list():
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        # create a file that will be "affected" by the plan
        existing = tmp / "notes.md"
        existing.write_text("original content")

        plan = Plan(
            goal="test snapshot",
            actions=[
                Action(ActionType.WRITE_FILE, "overwrite notes", {"path": str(existing)}, Risk.LOW),
                Action(ActionType.CREATE_DIR, "create new dir", {"path": str(tmp / "new_dir")}, Risk.LOW),
            ],
            reasoning="test",
        )

        snaps_dir = tmp / "snapshots"
        snap = take_snapshot(plan, snaps_dir)

        assert snap.snapshot_id
        assert len(snap.entries) == 2

        # existing file should have been backed up
        existing_entry = next(e for e in snap.entries if "notes.md" in e.path)
        assert existing_entry.existed is True
        assert existing_entry.backup_rel is not None

        # new_dir didn't exist yet
        new_entry = next(e for e in snap.entries if "new_dir" in e.path)
        assert new_entry.existed is False

        # list_snapshots should find it
        listed = list_snapshots(snaps_dir)
        assert len(listed) == 1
        assert listed[0].snapshot_id == snap.snapshot_id


@pytest.mark.offline
def test_snapshot_restore():
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        original_text = "original content"
        existing = tmp / "doc.md"
        existing.write_text(original_text)

        plan = Plan(
            goal="test restore",
            actions=[
                Action(ActionType.WRITE_FILE, "overwrite doc", {"path": str(existing)}, Risk.LOW),
                Action(ActionType.CREATE_DIR, "create dir", {"path": str(tmp / "new_dir")}, Risk.LOW),
            ],
            reasoning="test",
        )

        snaps_dir = tmp / "snapshots"
        snap = take_snapshot(plan, snaps_dir)

        # simulate plan execution: overwrite file, create dir
        existing.write_text("modified content")
        (tmp / "new_dir").mkdir()

        assert existing.read_text() == "modified content"
        assert (tmp / "new_dir").exists()

        # rollback
        restore_log = restore_snapshot(snap.snapshot_id, snaps_dir)

        assert existing.read_text() == original_text, "file should be restored"
        assert not (tmp / "new_dir").exists(), "plan-created dir should be removed"
        assert any("Restored" in r for r in restore_log)
        assert any("Removed" in r for r in restore_log)


@pytest.mark.offline
def test_engine_json_parsing():
    from crystal_mind.planner.plan import Action, ActionType, Risk
    sample = {
        "reasoning": "Need to create structure",
        "actions": [
            {"type": "create_dir", "description": "Create dir", "risk": "low",  "params": {"path": "/tmp/x"}},
            {"type": "delete",     "description": "Delete old",  "risk": "high", "params": {"path": "/tmp/y"}},
        ]
    }
    actions = [
        Action(
            type=ActionType(a["type"]),
            description=a["description"],
            risk=Risk(a.get("risk", "low")),
            params=a.get("params", {}),
        )
        for a in sample["actions"]
    ]
    plan = Plan("test", actions, sample["reasoning"])
    assert len(plan.low_risk()) == 1
    assert len(plan.high_risk()) == 1
    assert plan.high_risk()[0].type == ActionType.DELETE


# ── Online tests ──────────────────────────────────────────────────────────────

@pytest.mark.online
def test_api_connection():
    """Verify API key works and Claude responds."""
    import anthropic
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    msg = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=10,
        messages=[{"role": "user", "content": "Reply with the single word: OK"}],
    )
    assert "OK" in msg.content[0].text


@pytest.mark.online
def test_engine_full_plan():
    """Full plan generation via Claude API."""
    from crystal_mind.profiler.types import UserIntent
    from crystal_mind.profiler.builder import build
    from crystal_mind.collector.scanner import scan
    from crystal_mind.planner.engine import generate

    intent = UserIntent(
        who="PhD applicant, ML researcher",
        data_roots=[Path(__file__).parent.parent],
        goal="Create a TODO list file summarising what needs to be done"
    )
    scans = [scan(r) for r in intent.data_roots]
    profile = build(intent, scans)
    plan = generate(profile, model="claude-haiku-4-5-20251001")

    assert len(plan.actions) > 0
    assert plan.reasoning
    for a in plan.actions:
        assert isinstance(a.type, ActionType)
        assert isinstance(a.risk, Risk)
