"""
M1 Native Hybrid Scouter - FastAPI Backend

- /scout: Web解析（Maps, HP, SNS）→ Gemmaクリーニング → Gemini/GPT戦略生成
- /transcribe: mlx-whisper によるローカル文字起こし
- /health: ヘルスチェック
"""
import logging
import os
import traceback
from pathlib import Path

from dotenv import load_dotenv

# プロジェクトルート（../../.env）の .env を絶対パスで読み込み（ローカル用・本番では Render の環境変数を使用）
_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if _env_path.exists():
    load_dotenv(dotenv_path=_env_path)

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional

from routers import scout, transcribe, scripts, hearing

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")
logger = logging.getLogger(__name__)


class ExceptionLoggingMiddleware(BaseHTTPMiddleware):
    """全例外をキャッチし、エラー詳細をJSONでクライアントに返す（デバッグ用）"""

    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except HTTPException:
            raise
        except Exception as exc:
            tb = traceback.format_exc()
            logger.error("Unhandled exception: %s\n%s", exc, tb)
            print(f"[ERROR] {exc}\n{tb}")
            return JSONResponse(
                status_code=500,
                content={
                    "detail": str(exc),
                    "type": type(exc).__name__,
                    "traceback": tb.split("\n"),
                },
            )


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: 環境変数チェック（値は出さない）
    db_url = os.getenv("TURSO_DATABASE_URL")
    db_token = os.getenv("TURSO_AUTH_TOKEN")
    logger.info("TURSO_DATABASE_URL: %s", "set" if db_url else "NOT SET")
    logger.info("TURSO_AUTH_TOKEN: %s", "set" if db_token else "NOT SET")
    yield
    # Shutdown


app = FastAPI(
    title="M1 Hybrid Scouter API",
    version="0.1.0",
    lifespan=lifespan,
)

# 例外ログ（最外層で全リクエストをキャッチ）
app.add_middleware(ExceptionLoggingMiddleware)

# CORS: 拡張機能・ブラウザからの fetch を完全開放
# allow_origins=["*"] で chrome-extension:// 含む全オリジン許可（allow_credentials=False 必須）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scout.router, prefix="/scout", tags=["scout"])
app.include_router(transcribe.router, prefix="/transcribe", tags=["transcribe"])
# 拡張機能用: /scripts, /hearing をルート直下で応答（prefix なし、ルーター内でフルパス指定）
app.include_router(scripts.router, tags=["scripts"])
app.include_router(hearing.router, tags=["hearing"])


@app.get("/health")
async def health():
    """Cloudflare Tunnel / ローカル接続確認用"""
    return {"status": "ok", "service": "hybrid-scouter"}
