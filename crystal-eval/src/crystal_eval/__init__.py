"""
crystal-eval: Evaluation framework for LLM agent capability and security robustness.
"""

from .runner import EvalRunner
from .suite import EvalSuite
from .case import EvalCase, EvalResult, Verdict
from .metrics import Metrics
from .report import EvalReport

__version__ = "0.1.0"
__all__ = ["EvalRunner", "EvalSuite", "EvalCase", "EvalResult", "Verdict", "Metrics", "EvalReport"]
