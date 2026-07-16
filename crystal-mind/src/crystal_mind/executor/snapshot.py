"""
Pre-execution snapshot and rollback for crystal-mind.

Before any plan runs, take_snapshot() copies all affected paths into
.crystal-mind/snapshots/<timestamp>/ and writes a manifest.json.
restore_snapshot() reverses the changes: restores backed-up files and
removes paths that the plan created from scratch.
"""

from __future__ import annotations

import json
import os
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
    allowed_roots: list[str] = field(default_factory=list)
    entries: list[PathEntry] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "snapshot_id": self.snapshot_id,
            "timestamp": self.timestamp,
            "goal": self.goal,
            "allowed_roots": self.allowed_roots,
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
            allowed_roots=d.get("allowed_roots", []),
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

    # If both a directory and one of its children are present, the directory
    # snapshot already contains the child. Keeping only top-level paths avoids
    # duplicate backups and ambiguous rollback ordering.
    resolved = sorted({Path(p).expanduser().resolve() for p in result}, key=lambda p: len(p.parts))
    minimal: list[Path] = []
    for path in resolved:
        if not any(path == parent or path.is_relative_to(parent) for parent in minimal):
            minimal.append(path)
    return [str(path) for path in minimal]


def take_snapshot(
    plan: Plan,
    snapshots_dir: Path,
    *,
    allowed_roots: list[Path] | None = None,
) -> Snapshot:
    """
    Backup all paths affected by plan before execution.
    Returns the Snapshot object (manifest written to disk).
    """
    roots = allowed_roots or [Path(root).expanduser().resolve(strict=True) for root in plan.allowed_roots]
    if not roots:
        raise ValueError("Cannot create snapshot without allowed_roots")
    ts = datetime.now().strftime("%Y%m%dT%H%M%S%f")
    snap_dir = snapshots_dir / ts
    snap_dir.mkdir(parents=True, exist_ok=True)

    snapshot = Snapshot(
        snapshot_id=ts,
        timestamp=datetime.now().isoformat(),
        goal=plan.goal,
        allowed_roots=[str(root) for root in roots],
    )

    max_bytes = int(os.environ.get("CRYSTAL_MIND_MAX_SNAPSHOT_BYTES", str(512 * 1024 * 1024)))
    affected = _affected_paths(plan)
    estimated_bytes = sum(_path_size(Path(path)) for path in affected)
    if estimated_bytes > max_bytes:
        shutil.rmtree(snap_dir, ignore_errors=True)
        raise ValueError(
            f"Snapshot would require about {estimated_bytes / 1024 / 1024:.1f} MB, "
            f"exceeding the {max_bytes / 1024 / 1024:.1f} MB safety limit"
        )

    try:
        for abs_path_str in affected:
            p = Path(abs_path_str).expanduser().resolve()
            if not _within_roots(p, roots):
                raise ValueError(f"Refusing to snapshot path outside allowed_roots: {p}")
            entry = PathEntry(path=abs_path_str, existed=p.exists())

            if p.exists():
                entry.is_dir = p.is_dir()
                safe_name = f"entry-{len(snapshot.entries):04d}"
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
    except Exception:
        shutil.rmtree(snap_dir, ignore_errors=True)
        raise
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
    if not snapshot_id or any(c not in "0123456789T" for c in snapshot_id):
        raise ValueError("Invalid snapshot ID")
    snapshots_root = snapshots_dir.expanduser().resolve()
    snap_dir = (snapshots_root / snapshot_id).resolve()
    if snap_dir.parent != snapshots_root:
        raise ValueError("Snapshot path escapes snapshots directory")
    manifest_path = snap_dir / "manifest.json"

    if not manifest_path.exists():
        raise FileNotFoundError(f"Snapshot not found: {snapshot_id}")

    snapshot = Snapshot.from_dict(json.loads(manifest_path.read_text()))
    roots = [Path(root).expanduser().resolve(strict=True) for root in snapshot.allowed_roots]
    if not roots:
        raise ValueError("Legacy snapshot has no allowed_roots; refusing unsafe automatic restore")
    log: list[str] = []

    for entry in snapshot.entries:
        p = Path(entry.path).expanduser().resolve()
        if not _within_roots(p, roots):
            raise ValueError(f"Snapshot manifest path is outside allowed_roots: {p}")

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
            backup = (snap_dir / entry.backup_rel).resolve()
            if backup.parent != snap_dir:
                raise ValueError(f"Invalid backup path in snapshot: {entry.backup_rel}")
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


def _within_roots(path: Path, roots: list[Path]) -> bool:
    return any(path == root or path.is_relative_to(root) for root in roots)


def _path_size(path: Path) -> int:
    if not path.exists():
        return 0
    if path.is_file():
        return path.stat().st_size
    total = 0
    for child in path.rglob("*"):
        try:
            if child.is_file() and not child.is_symlink():
                total += child.stat().st_size
        except OSError:
            continue
    return total
