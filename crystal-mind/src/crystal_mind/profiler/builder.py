"""
Profile builder — combines scan results + user intent into a rich context
that the planner can reason over.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

from ..collector.scanner import ScanResult, FileNode
from ..collector.extractor import extract
from ..security import sanitize
from .types import UserIntent

MAX_FILE_SAMPLES = 40       # max files to include full previews for
MAX_PREVIEW_CHARS = 800     # per file

@dataclass
class FileSnapshot:
    path: str
    extension: str
    size_kb: float
    preview: str


@dataclass
class UserProfile:
    who: str
    goal: str
    data_roots: list[str]
    scan_summary: str
    key_files: list[FileSnapshot] = field(default_factory=list)
    dir_tree: str = ""

    def to_context_str(self) -> str:
        files_block = "\n\n".join(
            f"[{f.path}] ({f.extension}, {f.size_kb:.1f}KB)\n{f.preview}"
            for f in self.key_files
        )
        return (
            f"## USER PROFILE\n\n"
            f"**Who**: {self.who}\n\n"
            f"**Goal**: {self.goal}\n\n"
            f"**Data roots**: {', '.join(self.data_roots)}\n\n"
            f"**Data overview**: {self.scan_summary}\n\n"
            f"**Directory structure**:\n{self.dir_tree}\n\n"
            f"## KEY FILE CONTENTS\n\n{files_block}"
        )


def build(intent: UserIntent, scans: list[ScanResult]) -> UserProfile:
    all_files: list[FileNode] = []
    for scan in scans:
        all_files.extend(scan.files)

    scan_summary = "\n".join(s.summary() for s in scans)

    # Build directory tree (compact)
    dir_tree = _build_tree(intent.data_roots, max_depth=3)

    # Select most informative files: prefer .md, README, CV, plan, outline files
    priority_files = _prioritize(all_files)[:MAX_FILE_SAMPLES]

    snapshots = []
    for node in priority_files:
        content = node.preview or extract(node.path, MAX_PREVIEW_CHARS)
        content = sanitize(str(node.path), content[:MAX_PREVIEW_CHARS])
        snapshots.append(FileSnapshot(
            path=str(node.path),
            extension=node.extension,
            size_kb=node.size_bytes / 1024,
            preview=content,
        ))

    return UserProfile(
        who=intent.who,
        goal=intent.goal,
        data_roots=[str(r) for r in intent.data_roots],
        scan_summary=scan_summary,
        key_files=snapshots,
        dir_tree=dir_tree,
    )


def _prioritize(files: list[FileNode]) -> list[FileNode]:
    def score(f: FileNode) -> int:
        name = f.path.name.lower()
        s = 0
        if f.extension == ".md":
            s += 10
        if any(k in name for k in ("readme", "index", "cv", "plan", "outline", "meta", "todo")):
            s += 20
        if f.size_bytes < 50_000:
            s += 5
        return s

    return sorted(files, key=score, reverse=True)


def _build_tree(roots: list[Path], max_depth: int) -> str:
    import os
    lines = []
    for root in roots:
        lines.append(str(root))
        for dirpath, dirnames, filenames in os.walk(root):
            depth = len(Path(dirpath).relative_to(root).parts)
            if depth > max_depth:
                dirnames.clear()
                continue
            dirnames[:] = [d for d in dirnames if not d.startswith(".") and d not in {"node_modules", "__pycache__"}]
            indent = "  " * depth
            lines.append(f"{indent}{Path(dirpath).name}/")
            for f in filenames[:5]:
                lines.append(f"{indent}  {f}")
            if len(filenames) > 5:
                lines.append(f"{indent}  ... ({len(filenames) - 5} more)")
    return "\n".join(lines)
