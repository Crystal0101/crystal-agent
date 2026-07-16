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


MAX_FILES_DEFAULT = 10_000


def scan(
    root: str | Path,
    max_preview_chars: int = 200,
    max_files: int = MAX_FILES_DEFAULT,
) -> ScanResult:
    root = Path(root).expanduser().resolve()
    if not root.exists():
        raise FileNotFoundError(f"Scan root does not exist: {root}")
    if not root.is_dir():
        raise NotADirectoryError(f"Scan root is not a directory: {root}")
    if max_files < 1:
        raise ValueError("max_files must be at least 1")
    result = ScanResult(root=root)
    file_count = 0
    truncated = False

    for dirpath, dirnames, filenames in os.walk(root, followlinks=False):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        result.dir_count += len(dirnames)

        for fname in filenames:
            if file_count >= max_files:
                truncated = True
                break

            fpath = Path(dirpath) / fname
            ext = fpath.suffix.lower()
            if ext in SKIP_EXTENSIONS or fname.startswith("."):
                continue

            try:
                stat = fpath.stat()
            except OSError:
                continue

            if fpath.is_symlink():
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
            file_count += 1

        if truncated:
            import warnings
            warnings.warn(
                f"scan() stopped at {max_files} files under {root}. "
                "Pass a larger max_files if you need the full tree.",
                stacklevel=2,
            )
            break

    return result
