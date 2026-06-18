from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum, IntEnum
from typing import Any


class Severity(IntEnum):
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4

    def __str__(self) -> str:
        return self.name


class InjectionType(str, Enum):
    INSTRUCTION_OVERRIDE = "instruction_override"
    ROLE_HIJACKING = "role_hijacking"
    EXFILTRATION = "exfiltration"
    INDIRECT = "indirect"
    CONTEXT_BOUNDARY = "context_boundary"
    OBFUSCATION = "obfuscation"
    TOOL_HIJACKING = "tool_hijacking"
    CUSTOM = "custom"


@dataclass
class DetectionReport:
    source: str
    text: str
    findings: list[dict[str, Any]] = field(default_factory=list)

    @property
    def is_threat(self) -> bool:
        return len(self.findings) > 0

    @property
    def max_severity(self) -> Severity | None:
        if not self.findings:
            return None
        return max(f["severity"] for f in self.findings)

    @property
    def summary(self) -> str:
        if not self.is_threat:
            return f"[crystal-shield] CLEAN — source={self.source}"
        top = sorted(self.findings, key=lambda f: f["severity"], reverse=True)[0]
        return (
            f"[crystal-shield] THREAT DETECTED — source={self.source} "
            f"severity={top['severity']} type={top['type']} desc=\"{top['description']}\""
        )

    def to_dict(self) -> dict:
        return {
            "source": self.source,
            "is_threat": self.is_threat,
            "max_severity": str(self.max_severity) if self.max_severity else None,
            "findings": [
                {**f, "severity": str(f["severity"]), "type": str(f["type"])}
                for f in self.findings
            ],
        }
