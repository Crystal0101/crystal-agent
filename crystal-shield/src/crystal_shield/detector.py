"""
Core injection detector — model-independent, rule-based + heuristic analysis.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Callable

from .report import DetectionReport, Severity, InjectionType


# ── Injection pattern signatures ──────────────────────────────────────────────

_PATTERNS: list[tuple[str, InjectionType, Severity, str]] = [
    # (regex, type, severity, description)

    # Direct instruction override
    (r"ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?|constraints?)",
     InjectionType.INSTRUCTION_OVERRIDE, Severity.CRITICAL, "Ignore-previous-instructions attack"),

    (r"(forget|disregard|override)\s+(everything|all|your)\s+(you.ve\s+been\s+told|instructions?|training|rules?)",
     InjectionType.INSTRUCTION_OVERRIDE, Severity.CRITICAL, "Forget-instructions attack"),

    # Role / persona hijacking
    (r"(you\s+are\s+now|act\s+as|pretend\s+(to\s+be|you\s+are)|roleplay\s+as|your\s+new\s+(role|persona)\s+is)",
     InjectionType.ROLE_HIJACKING, Severity.HIGH, "Role hijacking attempt"),

    (r"(DAN|do\s+anything\s+now|jailbreak|developer\s+mode|god\s+mode)",
     InjectionType.ROLE_HIJACKING, Severity.CRITICAL, "Known jailbreak keyword"),

    # System prompt exfiltration
    (r"(repeat|print|output|reveal|show|tell\s+me|what\s+(is|are))\s+(your\s+)?(system\s+prompt|instructions?|initial\s+prompt|original\s+prompt)",
     InjectionType.EXFILTRATION, Severity.HIGH, "System prompt extraction attempt"),

    # Indirect injection via external content markers
    (r"<(injection|payload|system|instructions?)>",
     InjectionType.INDIRECT, Severity.HIGH, "Injection tag in content"),

    (r"\[INST\]|\[\/INST\]|<\|im_start\|>|<\|im_end\|>|\|\|SYSTEM\|\|",
     InjectionType.INDIRECT, Severity.CRITICAL, "Model-specific injection token"),

    # Context boundary attacks
    (r"(-{10,}|={10,}|\*{10,})\s*(end\s+of\s+(context|document|text)|new\s+instructions?)",
     InjectionType.CONTEXT_BOUNDARY, Severity.HIGH, "Context boundary manipulation"),

    # Encoding/obfuscation
    (r"base64\s*:\s*[A-Za-z0-9+/]{20,}={0,2}",
     InjectionType.OBFUSCATION, Severity.MEDIUM, "Base64-encoded payload"),

    # Tool/function call injection
    (r"(call|invoke|execute|run)\s+(tool|function|command|script)\s*[:：]?\s*\w+\s*\(",
     InjectionType.TOOL_HIJACKING, Severity.HIGH, "Suspicious tool invocation in content"),
]

_COMPILED: list[tuple[re.Pattern, InjectionType, Severity, str]] = [
    (re.compile(p, re.IGNORECASE | re.DOTALL), t, s, d)
    for p, t, s, d in _PATTERNS
]


# ── Heuristic checks ──────────────────────────────────────────────────────────

def _heuristic_entropy(text: str) -> float:
    """Shannon entropy — high entropy in short text may indicate encoded payload."""
    import math
    if not text:
        return 0.0
    freq = {c: text.count(c) / len(text) for c in set(text)}
    return -sum(p * math.log2(p) for p in freq.values())


def _heuristic_length_spike(text: str, context_avg_len: float) -> bool:
    """Single message much longer than context average = possible injection."""
    return context_avg_len > 0 and len(text) > context_avg_len * 5 and len(text) > 2000


# ── Detector ─────────────────────────────────────────────────────────────────

@dataclass
class InjectionDetector:
    """
    Model-independent prompt injection detector.

    Usage::

        detector = InjectionDetector()
        report = detector.scan(user_input)
        if report.is_threat:
            raise SecurityError(report.summary)
    """

    custom_patterns: list[tuple[str, Severity]] = field(default_factory=list)
    enable_heuristics: bool = True
    min_severity: Severity = Severity.LOW
    _extra: list[tuple[re.Pattern, Severity]] = field(init=False, default_factory=list)

    def __post_init__(self) -> None:
        self._extra = [
            (re.compile(p, re.IGNORECASE | re.DOTALL), s)
            for p, s in self.custom_patterns
        ]

    def add_pattern(self, pattern: str, severity: Severity = Severity.MEDIUM) -> None:
        self._extra.append((re.compile(pattern, re.IGNORECASE | re.DOTALL), severity))

    def scan(
        self,
        text: str,
        source: str = "unknown",
        context_messages: list[str] | None = None,
    ) -> DetectionReport:
        """
        Scan a single string for injection signals.

        Args:
            text: Input to scan.
            source: Label for where this text came from (e.g. "user", "tool_result", "webpage").
            context_messages: Previous messages for heuristic baseline.

        Returns:
            DetectionReport with findings.
        """
        findings: list[dict] = []

        # Rule-based scan
        for pattern, inj_type, severity, desc in _COMPILED:
            if severity < self.min_severity:
                continue
            for match in pattern.finditer(text):
                findings.append({
                    "type": inj_type,
                    "severity": severity,
                    "description": desc,
                    "match": match.group()[:120],
                    "position": match.start(),
                })

        # Custom extra patterns
        for pattern, severity in self._extra:
            if severity < self.min_severity:
                continue
            for match in pattern.finditer(text):
                findings.append({
                    "type": InjectionType.CUSTOM,
                    "severity": severity,
                    "description": "Custom pattern match",
                    "match": match.group()[:120],
                    "position": match.start(),
                })

        # Heuristics
        if self.enable_heuristics:
            entropy = _heuristic_entropy(text)
            if entropy > 4.8 and len(text) > 100:
                findings.append({
                    "type": InjectionType.OBFUSCATION,
                    "severity": Severity.LOW,
                    "description": f"High entropy content (entropy={entropy:.2f}) — possible encoding",
                    "match": text[:60] + "…",
                    "position": 0,
                })

            if context_messages:
                avg = sum(len(m) for m in context_messages) / len(context_messages)
                if _heuristic_length_spike(text, avg):
                    findings.append({
                        "type": InjectionType.INDIRECT,
                        "severity": Severity.MEDIUM,
                        "description": f"Length spike: {len(text)} chars vs avg {avg:.0f}",
                        "match": text[:60] + "…",
                        "position": 0,
                    })

        return DetectionReport(source=source, text=text, findings=findings)

    def scan_messages(
        self,
        messages: list[dict],
        source_key: str = "role",
        content_key: str = "content",
        trusted_roles: set[str] | None = None,
    ) -> list[DetectionReport]:
        """Scan a list of chat-style messages. Skips trusted roles (e.g. 'assistant')."""
        trusted = trusted_roles or {"assistant"}
        texts = [m.get(content_key, "") for m in messages]
        reports = []
        for i, msg in enumerate(messages):
            if msg.get(source_key) in trusted:
                continue
            ctx = texts[max(0, i - 5):i]
            reports.append(self.scan(str(msg.get(content_key, "")), source=str(msg.get(source_key, "unknown")), context_messages=ctx))
        return [r for r in reports if r.is_threat]
