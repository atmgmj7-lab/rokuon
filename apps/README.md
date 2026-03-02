# M1 Native Hybrid Scouter

Mac M1 をAIサーバーとして活用する営業支援OS。

## 構成

| ディレクトリ | 説明 |
|-------------|------|
| `backend-ai/` | Python FastAPI: Ollama, mlx-whisper, Playwright, RAG |
| `extension/` | Chrome Extension (Side Panel API) |

## クイックスタート

### 1. Python Backend

```bash
cd apps/backend-ai
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium
uvicorn main:app --host 0.0.0.0 --port 8765
```

### 2. Chrome Extension

`chrome://extensions` で `apps/extension` を読み込み。

### 3. Next.js（mlx-whisper 利用時）

```bash
USE_MLX_WHISPER=true MLX_WHISPER_URL=http://localhost:8765 npm run dev
```

## デプロイ

[../docs/deployment.md](../docs/deployment.md) を参照。
