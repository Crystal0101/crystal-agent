"""
crystal-shield: Model-independent prompt injection detection for LLM agents.
"""

from .detector import InjectionDetector
from .middleware import ShieldMiddleware
from .policy import Policy, PolicyRule, Action
from .report import DetectionReport, Severity

__version__ = "0.1.0"
__all__ = [
    "InjectionDetector",
    "ShieldMiddleware",
    "Policy",
    "PolicyRule",
    "Action",
    "DetectionReport",
    "Severity",
]
