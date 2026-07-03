"""
File system scanner — builds a structured index of a directory tree.
Extracts metadata and lightweight content summaries without loading everything into memory.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from datetime import datetime

SUPPORTED_TEXT = {".md", ".txt", ".py", ".ts", ".js", ".json", ".yaml", ".yml", ".toml", ".tex"}
SUPPORTED_RICH = {".pdf", ".docx", ".doc"}
SKIP_DIRS = {".git", "node_modules", "__pycache__", ".venv", "venv", ".DS_Store", "coverage"}
SKIP_EXTENSIONS = {".pyc", ".pyo", ".DS_Store", ".lock"}


@dataclass
class FileNode:
    path: Path
    size_bytes: int
    modified: datetime
    extension: str
    preview: str = ""        # first ~200 chars of content
    tags: list[str] = field(default_factory=list)


@dataclass
class ScanResult:
    root: Path
    files: list[FileNode] = field(default_factory=list)
    dir_count: int = 0
    total_bytes: int = 0

    def by_extension(self) -> dict[str, list[FileNode]]:
        result: dict[str, list[FileNode]] = {}
        for f in self.files:
            result.setdefault(f.extension, []).append(f)
        return result

    def summary(self) -> str:
        exts = self.by_extension()
        ext_summary = ", ".join(f"{ext or 'no-ext'}×{len(v)}" for ext, v in sorted(exts.items()))
        return (
            f"Root: {self.root}\n"
            f"Files: {len(self.files)} | Dirs: {self.dir_count} | "
            f"Size: {self.total_bytes / 1024 / 1024:.1f} MB\n"
            f"Types: {ext_summary}"
        )


def scan(root: str | Path, max_preview_chars: int = 200) -> ScanResult:
    root = Path(root).expanduser().resolve()
    result = ScanResult(root=root)

    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        result.dir_count += len(dirnames)

        for fname in filenames:
            fpath = Path(dirpath) / fname
            ext = fpath.suffix.lower()
            if ext in SKIP_EXTENSIONS or fname.startswith("."):
                continue

            try:
                stat = fpath.stat()
            except OSError:
                continue

            node = FileNode(
                path=fpath,
                size_bytes=stat.st_size,
                modified=datetime.fromtimestamp(stat.st_mtime),
                extension=ext,
            )

            if ext in SUPPORTED_TEXT and stat.st_size < 500_000:
                try:
                    text = fpath.read_text(encoding="utf-8", errors="ignore")
                    node.preview = text[:max_preview_chars].strip()
                except OSError:
                    pass

            result.files.append(node)
            result.total_bytes += stat.st_size

    return result
