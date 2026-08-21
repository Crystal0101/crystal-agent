#!/bin/bash
# HAM10000 一键下载脚本
# 运行前提：已在 ~/.kaggle/kaggle.json 中设置 Kaggle API 凭证
# 使用方法：cd experiments && bash download_ham10000.sh
#
# 注意：不要用 python3 -m pip install（Homebrew Python 3.13 受 PEP 668 保护）
#       脚本内部统一使用 .venv/bin/pip，无需系统级 pip 权限

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DATA_DIR="$SCRIPT_DIR/data/HAM10000"
VENV="$SCRIPT_DIR/.venv/bin"

echo "========================================"
echo "  HAM10000 Dataset Download Script"
echo "  目标目录: $DATA_DIR"
echo "========================================"

# 取消代理（TUN 模式自动处理路由）
unset ALL_PROXY HTTPS_PROXY HTTP_PROXY all_proxy https_proxy http_proxy

# ── 步骤0：检查 venv ──────────────────────────
if [ ! -f "$VENV/python" ]; then
    echo "❌ 未找到 venv：$VENV/python"
    echo "   请先执行：cd $SCRIPT_DIR && python3 -m venv .venv"
    exit 1
fi
echo "✅ venv 就绪: $VENV"

# ── 步骤1：检查 Kaggle 凭证 ──────────────────
if [ ! -f ~/.kaggle/kaggle.json ]; then
    echo ""
    echo "❌ 未找到 Kaggle 凭证文件 (~/.kaggle/kaggle.json)"
    echo "   凭证已由 Claude 预先写入，若缺失请重新执行："
    echo "   mkdir -p ~/.kaggle"
    echo "   echo '{\"token\":\"KGAT_...\"}' > ~/.kaggle/kaggle.json"
    echo "   chmod 600 ~/.kaggle/kaggle.json"
    exit 1
fi
chmod 600 ~/.kaggle/kaggle.json
echo "✅ 凭证文件存在"

# ── 步骤2：设置 token（必须在 kaggle import 之前）────────────
TOKEN_VAL=$("$VENV/python" -c "
import json, os
d = json.load(open(os.path.expanduser('~/.kaggle/kaggle.json')))
print(d.get('token', ''))
" 2>/dev/null)
if [[ "$TOKEN_VAL" == KGAT_* ]]; then
    export KAGGLE_TOKEN="$TOKEN_VAL"
    echo "✅ 使用新式 API Token (KGAT_)"
else
    echo "✅ 使用 Legacy API Key"
fi

# ── 步骤3：下载数据集（直接用 wget REST API，不依赖 kaggle Python 包）──
mkdir -p "$DATA_DIR"
ZIP_PATH="$DATA_DIR/ham10000.zip"

echo ""
echo "开始下载 HAM10000（~3.5GB，视网速约需 5-20 分钟）..."

if [[ "$TOKEN_VAL" == KGAT_* ]]; then
    # 新式 token：Bearer Authorization header，用 curl（macOS SSL 兼容更好）
    curl -L \
         -H "Authorization: Bearer $TOKEN_VAL" \
         -o "$ZIP_PATH" \
         --progress-bar \
         "https://www.kaggle.com/api/v1/datasets/download/kmader/skin-lesion-analysis-toward-melanoma-detection"
else
    # Legacy key：从 kaggle.json 读取 username + key
    KAGGLE_USER=$("$VENV/python" -c "import json,os; d=json.load(open(os.path.expanduser('~/.kaggle/kaggle.json'))); print(d['username'])" 2>/dev/null)
    KAGGLE_KEY=$("$VENV/python"  -c "import json,os; d=json.load(open(os.path.expanduser('~/.kaggle/kaggle.json'))); print(d['key'])"      2>/dev/null)
    curl -L \
         -u "$KAGGLE_USER:$KAGGLE_KEY" \
         -o "$ZIP_PATH" \
         --progress-bar \
         "https://www.kaggle.com/api/v1/datasets/download/kmader/skin-lesion-analysis-toward-melanoma-detection"
fi

echo "✅ 下载完成，开始解压..."
unzip -q "$ZIP_PATH" -d "$DATA_DIR"
rm "$ZIP_PATH"
echo "✅ 解压完成，zip 已清理"

# ── 步骤4：整理目录结构 ────────────────────────
echo ""
echo "整理目录结构..."

# 确保期望的目录名存在
cd "$DATA_DIR"

# part1/part2 目录名兼容处理（Kaggle 解压后目录名可能略有不同）
for PART in 1 2; do
    for DIRNAME in "HAM10000_images_part_${PART}" "ham10000_images_part${PART}"; do
        if [ -d "$DIRNAME" ]; then
            TARGET="HAM10000_images_part_${PART}"
            if [ "$DIRNAME" != "$TARGET" ]; then
                mv "$DIRNAME" "$TARGET"
                echo "  重命名: $DIRNAME → $TARGET"
            fi
        fi
    done
done

# 列出最终结构
echo ""
echo "最终目录结构："
ls -lh "$DATA_DIR/"
echo ""

# 检查关键文件
CSV_FILE="$DATA_DIR/HAM10000_metadata.csv"
PART1_DIR="$DATA_DIR/HAM10000_images_part_1"
PART2_DIR="$DATA_DIR/HAM10000_images_part_2"

PASS=0
[ -f "$CSV_FILE" ] && echo "✅ HAM10000_metadata.csv 存在" && PASS=$((PASS+1)) || echo "❌ 缺失 HAM10000_metadata.csv"
[ -d "$PART1_DIR" ] && echo "✅ HAM10000_images_part_1/ 存在 ($(ls "$PART1_DIR" | wc -l | tr -d ' ') 张)" && PASS=$((PASS+1)) || echo "❌ 缺失 HAM10000_images_part_1/"
[ -d "$PART2_DIR" ] && echo "✅ HAM10000_images_part_2/ 存在 ($(ls "$PART2_DIR" | wc -l | tr -d ' ') 张)" && PASS=$((PASS+1)) || echo "❌ 缺失 HAM10000_images_part_2/"

echo ""
if [ "$PASS" -eq 3 ]; then
    echo "========================================"
    echo "  ✅ 数据集准备完成！共检查 3/3 项通过"
    echo "  可以开始训练："
    echo "  cd experiments"
    echo "  .venv/bin/python train.py --model resnet50"
    echo "========================================"
else
    echo "⚠️  $PASS/3 项通过，请检查上方提示"
fi
