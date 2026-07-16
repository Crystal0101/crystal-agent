from __future__ import annotations
from dataclasses import dataclass
import re
import sqlite3


@dataclass(frozen=True)
class Document:
    document_id: str
    title: str
    content: str
    acl: frozenset[str]


@dataclass(frozen=True)
class SearchResult:
    document_id: str
    title: str
    snippet: str
    score: float


class KnowledgeBase:
    """SQLite FTS knowledge base with retrieval-time ACL enforcement."""

    def __init__(self, path: str = ":memory:") -> None:
        self.db = sqlite3.connect(path)
        self.db.execute(
            "CREATE TABLE IF NOT EXISTS documents(id TEXT PRIMARY KEY,title TEXT,content TEXT,acl TEXT)"
        )
        self.db.execute(
            "CREATE VIRTUAL TABLE IF NOT EXISTS search USING fts5(id UNINDEXED,title,content)"
        )

    def upsert(self, document: Document) -> None:
        content = _sanitize(document.content)
        with self.db:
            self.db.execute("DELETE FROM search WHERE id=?", (document.document_id,))
            self.db.execute(
                "INSERT OR REPLACE INTO documents VALUES(?,?,?,?)",
                (
                    document.document_id,
                    document.title,
                    content,
                    ",".join(sorted(document.acl)),
                ),
            )
            self.db.execute(
                "INSERT INTO search VALUES(?,?,?)",
                (document.document_id, document.title, content),
            )

    def search(
        self, query: str, principals: set[str], limit: int = 5
    ) -> list[SearchResult]:
        terms = " OR ".join(re.findall(r"[\w-]+", query)[:12])
        if not terms:
            return []
        rows = self.db.execute(
            "SELECT d.id,d.title,snippet(search,2,'<b>','</b>','...',20),bm25(search),d.acl FROM search JOIN documents d ON d.id=search.id WHERE search MATCH ? ORDER BY bm25(search) LIMIT ?",
            (terms, max(limit * 5, 20)),
        ).fetchall()
        output = []
        for doc_id, title, snippet, rank, acl in rows:
            allowed = set(acl.split(",")) if acl else set()
            if "public" in allowed or principals & allowed:
                output.append(SearchResult(doc_id, title, snippet, float(-rank)))
            if len(output) >= limit:
                break
        return output

    def context(self, query: str, principals: set[str]) -> str:
        results = self.search(query, principals)
        return "\n\n".join(
            f"[source:{x.document_id}] {x.title}\n{x.snippet}" for x in results
        )


def _sanitize(content: str) -> str:
    patterns = (
        r"ignore\s+previous\s+instructions",
        r"reveal\s+.*system\s+prompt",
        r"<\|im_start\|>",
    )
    if any(re.search(pattern, content, re.I) for pattern in patterns):
        return "[blocked: potentially hostile embedded instructions]"
    return content[:100_000]
