"""
Pre-execution snapshot and rollback for crystal-mind.

Before any plan runs, take_snapshot() copies all affected paths into
.crystal-mind/snapshots/<timestamp>/ and writes a manifest.json.
restore_snapshot() reverses the changes: restores backed-up files and
removes paths that the plan created from scratch.
"""

from __future__ import annotations

import json
import shutil
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional

from ..planner.plan import ActionType, Plan


@dataclass
class PathEntry:
    path: str
    existed: bool
    is_dir: bool = False
    backup_rel: Optional[str] = None  # relative path inside snapshot dir


@dataclass
class Snapshot:
    snapshot_id: str
    timestamp: str
    goal: str
    entries: list[PathEntry] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "snapshot_id": self.snapshot_id,
            "timestamp": self.timestamp,
            "goal": self.goal,
            "entries": [
                {
                    "path": e.path,
                    "existed": e.existed,
                    "is_dir": e.is_dir,
                    "backup_rel": e.backup_rel,
                }
                for e in self.entries
            ],
        }

    @classmethod
    def from_dict(cls, d: dict) -> "Snapshot":
        return cls(
            snapshot_id=d["snapshot_id"],
            timestamp=d["timestamp"],
            goal=d["goal"],
            entries=[
                PathEntry(
                    path=e["path"],
                    existed=e["existed"],
                    is_dir=e.get("is_dir", False),
                    backup_rel=e.get("backup_rel"),
                )
                for e in d.get("entries", [])
            ],
        )


def _affected_paths(plan: Plan) -> list[str]:
    """Collect all filesystem paths that plan actions will touch, deduplicated."""
    seen: set[str] = set()
    result: list[str] = []

    def _add(p: str) -> None:
        if p and p not in seen:
            seen.add(p)
            result.append(p)

    for action in plan.actions:
        p = action.params
        match action.type:
            case ActionType.CREATE_DIR:
                _add(p.get("path", ""))
            case ActionType.MOVE_FILE:
                _add(p.get("src", ""))
                _add(p.get("dst", ""))
            case ActionType.WRITE_FILE | ActionType.REPORT:
                _add(p.get("path", ""))
            case ActionType.ARCHIVE:
                _add(p.get("src", ""))
                src = p.get("src", "")
                archive_dir = p.get("archive_dir", "")
                if src and archive_dir:
                    _add(str(Path(archive_dir) / Path(src).name))
            case ActionType.DELETE:
                _add(p.get("path", ""))
            case _:
                pass  # NOTE / EXTERNAL touch no files

    return result


def take_snapshot(plan: Plan, snapshots_dir: Path) -> Snapshot:
    """
    Backup all paths affected by plan before execution.
    Returns the Snapshot object (manifest written to disk).
    """
    ts = datetime.now().strftime("%Y%m%dT%H%M%S")
    snap_dir = snapshots_dir / ts
    snap_dir.mkdir(parents=True, exist_ok=True)

    snapshot = Snapshot(
        snapshot_id=ts,
        timestamp=datetime.now().isoformat(),
        goal=plan.goal,
    )

    for abs_path_str in _affected_paths(plan):
        p = Path(abs_path_str)
        entry = PathEntry(path=abs_path_str, existed=p.exists())

        if p.exists():
            entry.is_dir = p.is_dir()
            # safe filename: replace / with __ so it's a flat file inside snap_dir
            safe_name = abs_path_str.lstrip("/").replace("/", "__")
            entry.backup_rel = safe_name
            backup_dst = snap_dir / safe_name

            if p.is_dir():
                shutil.copytree(str(p), str(backup_dst))
            else:
                backup_dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(str(p), str(backup_dst))

        snapshot.entries.append(entry)

    (snap_dir / "manifest.json").write_text(
        json.dumps(snapshot.to_dict(), indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    return snapshot


def list_snapshots(snapshots_dir: Path) -> list[Snapshot]:
    """Return all snapshots sorted newest-first."""
    if not snapshots_dir.exists():
        return []
    snapshots = []
    for manifest in sorted(snapshots_dir.glob("*/manifest.json"), reverse=True):
        try:
            snapshots.append(Snapshot.from_dict(json.loads(manifest.read_text())))
        except Exception:
            pass
    return snapshots


def restore_snapshot(snapshot_id: str, snapshots_dir: Path) -> list[str]:
    """
    Restore filesystem state to what it was before snapshot_id ran.

    - Paths that didn't exist before the plan: deleted.
    - Paths that existed before the plan: restored from backup.

    Returns a log of what was done.
    """
    snap_dir = snapshots_dir / snapshot_id
    manifest_path = snap_dir / "manifest.json"

    if not manifest_path.exists():
        raise FileNotFoundError(f"Snapshot not found: {snapshot_id}")

    snapshot = Snapshot.from_dict(json.loads(manifest_path.read_text()))
    log: list[str] = []

    for entry in snapshot.entries:
        p = Path(entry.path)

        if not entry.existed:
            # plan created this path — remove it
            if p.exists():
                if p.is_dir():
                    shutil.rmtree(str(p))
                else:
                    p.unlink()
                log.append(f"Removed (plan-created): {entry.path}")
            else:
                log.append(f"Skip (already absent): {entry.path}")
        else:
            # restore from backup
            if entry.backup_rel is None:
                log.append(f"WARNING: no backup recorded for {entry.path}")
                continue
            backup = snap_dir / entry.backup_rel
            if not backup.exists():
                log.append(f"WARNING: backup file missing for {entry.path}")
                continue

            # remove current version first
            if p.exists():
                if p.is_dir():
                    shutil.rmtree(str(p))
                else:
                    p.unlink()

            p.parent.mkdir(parents=True, exist_ok=True)
            if entry.is_dir:
                shutil.copytree(str(backup), str(p))
            else:
                shutil.copy2(str(backup), str(p))
            log.append(f"Restored: {entry.path}")

    return log
