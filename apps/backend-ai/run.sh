#!/bin/bash
# M1 Hybrid Scouter - Python Backend 起動スクリプト
set -e
cd "$(dirname "$0")"

VENV=".venv"
PYTHON="${VENV}/bin/python"
PIP="${VENV}/bin/pip"

# venv がなければ作成
if [ ! -d "$VENV" ]; then
  echo "Creating virtual environment..."
  python3 -m venv "$VENV"
fi

# 依存関係インストール
echo "Installing dependencies..."
"$PIP" install -q -r requirements.txt

# Playwright ブラウザ（初回のみ）
echo "Installing Playwright Chromium (if needed)..."
"$PYTHON" -m playwright install chromium 2>/dev/null || true

echo ""
echo "Starting server on http://localhost:8765"
echo "Press Ctrl+C to stop"
echo ""
exec "${VENV}/bin/uvicorn" main:app --host 0.0.0.0 --port 8765 --reload
