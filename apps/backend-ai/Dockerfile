# M1 Hybrid Scouter - Python Backend
# Render / Railway 等のクラウドデプロイ用
FROM python:3.11-slim

WORKDIR /app

# システム依存（Playwright用）
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Playwright Chromium インストール（scout用・オプション）
RUN playwright install chromium 2>/dev/null || true

COPY . .

# プロジェクトルートの .env はビルド時に含まれない想定。
# 本番では Render/Railway の環境変数で TURSO_* 等を設定すること。
EXPOSE 8765

# Render/Railway は PORT 環境変数を設定。未設定時は 8765
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8765}"]
