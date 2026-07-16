from __future__ import annotations
from collections import Counter
from dataclasses import dataclass
from typing import Iterable
from sklearn.feature_extraction.text import TfidfVectorizer  # type: ignore[import-untyped]
from sklearn.linear_model import LogisticRegression  # type: ignore[import-untyped]
from sklearn.pipeline import Pipeline  # type: ignore[import-untyped]


@dataclass
class TicketClassifier:
    confidence_threshold: float = 0.55

    def __post_init__(self) -> None:
        self.model = Pipeline(
            [
                ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1)),
                ("model", LogisticRegression(max_iter=1000, class_weight="balanced")),
            ]
        )
        self.labels: set[str] = set()

    def fit(self, texts: list[str], labels: list[str]) -> "TicketClassifier":
        if len(texts) != len(labels) or len(set(labels)) < 2:
            raise ValueError(
                "aligned examples from at least two categories are required"
            )
        self.model.fit(texts, labels)
        self.labels = set(labels)
        return self

    def predict(self, texts: list[str]) -> list[dict[str, object]]:
        probabilities = self.model.predict_proba(texts)
        classes = self.model.classes_
        output = []
        for row in probabilities:
            index = int(row.argmax())
            confidence = float(row[index])
            label = str(classes[index])
            output.append(
                {
                    "category": label
                    if confidence >= self.confidence_threshold
                    else "needs_review",
                    "suggested_category": label,
                    "confidence": confidence,
                }
            )
        return output


def summarize(records: Iterable[dict[str, object]]) -> dict[str, object]:
    rows = list(records)
    categories = Counter(str(row.get("category", "unknown")) for row in rows)
    resolutions = [
        float(row["resolution_hours"])
        for row in rows
        if row.get("resolution_hours") is not None
    ]
    satisfactions = [
        float(row["satisfaction"])
        for row in rows
        if row.get("satisfaction") is not None
    ]
    return {
        "tickets": len(rows),
        "categories": dict(categories),
        "mean_resolution_hours": sum(resolutions) / len(resolutions)
        if resolutions
        else None,
        "mean_satisfaction": sum(satisfactions) / len(satisfactions)
        if satisfactions
        else None,
    }
