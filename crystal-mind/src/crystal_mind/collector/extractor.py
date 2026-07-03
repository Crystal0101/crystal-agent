"""
Content extractor — pulls readable text from various file formats.
Returns plain text for LLM consumption.
"""

from __future__ import annotations

from pathlib import Path


def extract(path: Path, max_chars: int = 4000) -> str:
    ext = path.suffix.lower()

    if ext in {".md", ".txt", ".tex", ".py", ".ts", ".js", ".json", ".yaml", ".yml", ".toml"}:
        return _read_text(path, max_chars)
    elif ext == ".pdf":
        return _read_pdf(path, max_chars)
    elif ext in {".docx", ".doc"}:
        return _read_docx(path, max_chars)
    else:
        return ""


def _read_text(path: Path, max_chars: int) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="ignore")[:max_chars]
    except OSError:
        return ""


def _read_pdf(path: Path, max_chars: int) -> str:
    try:
        import fitz  # pymupdf
        doc = fitz.open(str(path))
        text = ""
        for page in doc:
            text += page.get_text()
            if len(text) >= max_chars:
                break
        return text[:max_chars]
    except Exception:
        return ""


def _read_docx(path: Path, max_chars: int) -> str:
    try:
        from docx import Document
        doc = Document(str(path))
        text = "\n".join(p.text for p in doc.paragraphs)
        return text[:max_chars]
    except Exception:
        return ""
