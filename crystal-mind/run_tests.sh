#!/bin/bash
# crystal-mind 完整测试脚本
# 运行前确保：
#   1. 代理/VPN 已启动（能访问 pypi.org 和 api.anthropic.com）
#   2. export ANTHROPIC_API_KEY=sk-ant-...

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== 创建虚拟环境 ==="
python3 -m venv .venv
source .venv/bin/activate

echo ""
echo "=== 安装依赖 ==="
pip install -q anthropic click rich pydantic pymupdf python-docx pytest

echo ""
echo "=== 安装 crystal-mind（开发模式）==="
pip install -q -e ".[dev]"

echo ""
echo "=== 离线测试 (11 个) ==="
PYTHONPATH=src pytest tests/test_all.py -m offline -v

echo ""
echo "=== 在线测试 (2 个，调用 Claude API) ==="
if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "⚠  ANTHROPIC_API_KEY 未设置，跳过在线测试"
else
  PYTHONPATH=src pytest tests/test_all.py -m online -v
fi

echo ""
echo "=== 端到端冒烟测试 ==="
# 非交互式：直接调用 pipeline（跳过 interview，传入固定参数）
python3 - << 'PYEOF'
import sys, os
from pathlib import Path
sys.path.insert(0, "src")
from crystal_mind.profiler.types import UserIntent
from crystal_mind.profiler.builder import build
from crystal_mind.collector.scanner import scan
from crystal_mind.planner.engine import generate
from crystal_mind.planner.plan import ActionType, Risk

intent = UserIntent(
    who="Test: PhD applicant, ML researcher",
    data_roots=[Path(".")],
    goal="List what files exist and suggest one improvement action"
)
scans = [scan(r) for r in intent.data_roots]
profile = build(intent, scans)
print(f"Profile built: {len(profile.key_files)} key files, context {len(profile.to_context_str())} chars")

plan = generate(profile, model="claude-haiku-4-5-20251001")
print(f"Plan generated: {len(plan.actions)} actions")
print(f"Reasoning: {plan.reasoning[:100]}...")
for a in plan.actions[:3]:
    print(f"  [{a.risk.value}] {a.type.value}: {a.description[:60]}")
print("✓ End-to-end smoke test PASSED")
PYEOF

echo ""
echo "=============================="
echo "  ALL TESTS COMPLETE"
echo "=============================="
