"""
Framework-agnostic middleware — wrap any LLM call with injection protection.
"""

from __future__ import annotations

import functools
from typing import Callable

from .detector import InjectionDetector
from .policy import BALANCED, Policy
from .report import DetectionReport


class ShieldMiddleware:
    """
    Drop-in protection layer for LLM agent pipelines.

    Works with any LLM client (OpenAI, Anthropic, LiteLLM, etc.)
    by wrapping the call function.

    Example::

        import anthropic
        from crystal_shield import ShieldMiddleware

        client = anthropic.Anthropic()
        shield = ShieldMiddleware()

        @shield.protect
        def call_llm(messages):
            return client.messages.create(
                model="claude-3-5-haiku-20241022",
                messages=messages,
                max_tokens=1024,
            )

        # Injections in messages will now be detected and blocked.
        result = call_llm(messages)
    """

    def __init__(
        self,
        policy: Policy | None = None,
        detector: InjectionDetector | None = None,
        scan_keys: list[str] | None = None,
        trusted_roles: set[str] | None = None,
    ) -> None:
        self.policy = policy or BALANCED
        self.detector = detector or InjectionDetector()
        self.scan_keys = scan_keys or ["content"]
        self.trusted_roles = trusted_roles or {"assistant", "system"}

    def scan_input(self, messages: list[dict]) -> list[DetectionReport]:
        """Scan a message list and return threat reports."""
        reports = []
        for msg in messages:
            role = msg.get("role", "unknown")
            if role in self.trusted_roles:
                continue
            for key in self.scan_keys:
                val = msg.get(key, "")
                if isinstance(val, str):
                    report = self.detector.scan(val, source=f"{role}.{key}")
                    if report.is_threat:
                        reports.append(report)
                elif isinstance(val, list):
                    for block in val:
                        if isinstance(block, dict) and block.get("type") == "text":
                            report = self.detector.scan(
                                block.get("text", ""), source=f"{role}.{key}[text]"
                            )
                            if report.is_threat:
                                reports.append(report)
        return reports

    def protect(self, fn: Callable) -> Callable:
        """Decorator — scans `messages` kwarg or first positional arg."""

        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            messages = kwargs.get("messages") or (args[0] if args and isinstance(args[0], list) else None)
            if messages:
                threats = self.scan_input(messages)
                for report in threats:
                    self.policy.enforce(report)
            return fn(*args, **kwargs)

        return wrapper

    def wrap_tool_output(self, tool_name: str, output: str) -> str:
        """Scan tool/function output before it enters the agent context."""
        report = self.detector.scan(output, source=f"tool:{tool_name}")
        return self.policy.enforce(report)
