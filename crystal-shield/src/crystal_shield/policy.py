"""
Policy engine — define what crystal-shield does when a threat is detected.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import auto, Enum
from typing import Callable

from .report import DetectionReport, Severity


class Action(Enum):
    ALLOW = auto()       # pass through (log only)
    REDACT = auto()      # replace matched spans with [REDACTED]
    BLOCK = auto()       # raise ShieldBlockedError
    CALLBACK = auto()    # call user-provided handler


class ShieldBlockedError(RuntimeError):
    def __init__(self, report: DetectionReport) -> None:
        super().__init__(report.summary)
        self.report = report


@dataclass
class PolicyRule:
    min_severity: Severity = Severity.HIGH
    action: Action = Action.BLOCK
    callback: Callable[[DetectionReport], None] | None = None


@dataclass
class Policy:
    """
    A policy maps severity levels to actions.

    Example::

        policy = Policy(
            rules=[
                PolicyRule(min_severity=Severity.CRITICAL, action=Action.BLOCK),
                PolicyRule(min_severity=Severity.MEDIUM,   action=Action.REDACT),
                PolicyRule(min_severity=Severity.LOW,      action=Action.ALLOW),
            ]
        )
    """

    rules: list[PolicyRule] = field(default_factory=lambda: [
        PolicyRule(min_severity=Severity.HIGH, action=Action.BLOCK),
        PolicyRule(min_severity=Severity.LOW,  action=Action.ALLOW),
    ])
    log_fn: Callable[[str], None] | None = None

    def enforce(self, report: DetectionReport) -> str:
        """
        Enforce policy on a DetectionReport.
        Returns (possibly redacted) text, or raises ShieldBlockedError.
        """
        if not report.is_threat:
            return report.text

        sev = report.max_severity
        rule = self._match_rule(sev)

        if self.log_fn:
            self.log_fn(report.summary)

        if rule.action == Action.ALLOW:
            return report.text

        if rule.action == Action.BLOCK:
            raise ShieldBlockedError(report)

        if rule.action == Action.REDACT:
            return self._redact(report)

        if rule.action == Action.CALLBACK and rule.callback:
            rule.callback(report)
            return report.text

        return report.text

    def _match_rule(self, severity: Severity) -> PolicyRule:
        for rule in sorted(self.rules, key=lambda r: r.min_severity, reverse=True):
            if severity >= rule.min_severity:
                return rule
        return PolicyRule(action=Action.ALLOW)

    def _redact(self, report: DetectionReport) -> str:
        text = report.text
        # Replace matched spans (sorted by position descending to preserve indices)
        spans = sorted(
            [(f["position"], f["position"] + len(f["match"])) for f in report.findings],
            reverse=True,
        )
        for start, end in spans:
            text = text[:start] + "[REDACTED]" + text[end:]
        return text


# Preset policies
STRICT = Policy(rules=[
    PolicyRule(min_severity=Severity.LOW, action=Action.BLOCK),
])

BALANCED = Policy(rules=[
    PolicyRule(min_severity=Severity.HIGH,   action=Action.BLOCK),
    PolicyRule(min_severity=Severity.MEDIUM, action=Action.REDACT),
    PolicyRule(min_severity=Severity.LOW,    action=Action.ALLOW),
])

PERMISSIVE = Policy(rules=[
    PolicyRule(min_severity=Severity.CRITICAL, action=Action.BLOCK),
    PolicyRule(min_severity=Severity.LOW,      action=Action.ALLOW),
])
