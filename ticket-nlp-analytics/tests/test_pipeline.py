import pytest
from ticket_nlp import TicketClassifier, summarize


def trained():
    return TicketClassifier(0.4).fit(
        ["vpn cannot connect", "reset vpn", "database query slow", "postgres timeout"],
        ["network.vpn", "network.vpn", "data.database", "data.database"],
    )


def test_classifier_outputs_schema():
    result = trained().predict(["vpn connection failed"])[0]
    assert result["category"] == "network.vpn" and 0 <= result["confidence"] <= 1


def test_low_confidence_routes_to_review():
    assert (
        TicketClassifier(0.999)
        .fit(
            ["vpn issue", "vpn reset", "db issue", "db slow"],
            ["vpn", "vpn", "db", "db"],
        )
        .predict(["unknown request"])[0]["category"]
        == "needs_review"
    )


def test_analytics_handles_missing_values():
    result = summarize(
        [
            {"category": "vpn", "resolution_hours": 2, "satisfaction": 5},
            {"category": "vpn"},
        ]
    )
    assert result["tickets"] == 2 and result["mean_resolution_hours"] == 2


def test_training_validation():
    with pytest.raises(ValueError):
        TicketClassifier().fit(["one"], ["only"])
