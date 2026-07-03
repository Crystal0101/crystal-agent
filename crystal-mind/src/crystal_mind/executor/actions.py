"""
Primitive file operations — each returns a result string.
All operations are logged before execution.
"""

from __future__ import annotations

import shutil
from pathlib import Path


def create_dir(path: str) -> str:
    p = Path(path)
    p.mkdir(parents=True, exist_ok=True)
    return f"Created directory: {path}"


def move_file(src: str, dst: str) -> str:
    s, d = Path(src), Path(dst)
    if not s.exists():
        return f"SKIP (not found): {src}"
    d.parent.mkdir(parents=True, exist_ok=True)
    if d.exists():
        return f"SKIP (destination exists): {dst}"
    shutil.move(str(s), str(d))
    return f"Moved: {src} → {dst}"


def write_file(path: str, content: str) -> str:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    return f"Written: {path} ({len(content)} chars)"


def archive(src: str, archive_dir: str) -> str:
    s = Path(src)
    if not s.exists():
        return f"SKIP (not found): {src}"
    a = Path(archive_dir)
    a.mkdir(parents=True, exist_ok=True)
    dst = a / s.name
    if dst.exists():
        return f"SKIP (already archived): {dst}"
    shutil.move(str(s), str(dst))
    return f"Archived: {src} → {dst}"


def delete(path: str) -> str:
    p = Path(path)
    if not p.exists():
        return f"SKIP (not found): {path}"
    if p.is_dir():
        shutil.rmtree(str(p))
    else:
        p.unlink()
    return f"Deleted: {path}"
