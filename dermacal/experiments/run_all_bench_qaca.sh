#!/bin/bash
set -e
unset ALL_PROXY HTTPS_PROXY HTTP_PROXY all_proxy https_proxy http_proxy

EXP="$(cd "$(dirname "$0")" && pwd)"
cd "$EXP"

VENV="$EXP/.venv/bin/python"
LOG="$EXP/logs/benchmark_qaca.log"
mkdir -p "$EXP/logs"

echo "========================================"
echo "  DermaCal Benchmark + QACA Runner"
echo "========================================"

for MODEL in resnet50 efficientnet_b0 vit_b_16 dinov2_b; do
    echo ""
    echo "===== [benchmark] $MODEL ====="
    "$VENV" run_benchmark.py \
        --model "$MODEL" \
        --ckpt "results/baseline/$MODEL/best.pt"

    echo ""
    echo "===== [qaca] $MODEL ====="
    "$VENV" run_qaca.py \
        --model "$MODEL" \
        --ckpt "results/baseline/$MODEL/best.pt"

    echo "===== DONE: $MODEL ====="
done

echo ""
echo "ALL BENCHMARK + QACA DONE"
