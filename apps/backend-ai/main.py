"""
M1 Native Hybrid Scouter - FastAPI Backend

- /scout: Web解析（Maps, HP, SNS）→ Gemmaクリーニング → Gemini/GPT戦略生成
- /transcribe: mlx-whisper によるローカル文字起こし
- /health: ヘルスチェック
"""
from pathlib import Path

from dotenv import load_dotenv

# プロジェクトルート（../../.env）の .env を絶対パスで読み込み
_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=_env_path)

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os

from routers import scout, transcribe, scripts, hearing


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ollama, mlx-whisper の準備確認
    yield
    # Shutdown


app = FastAPI(
    title="M1 Hybrid Scouter API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS: ブラウザからの直接 fetch（音声アップロード等）を許可
# allow_origins=["*"] で全オリジン許可（allow_credentials は False で併用）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scout.router, prefix="/scout", tags=["scout"])
app.include_router(transcribe.router, prefix="/transcribe", tags=["transcribe"])
# 拡張機能用: /scripts, /hearing を直下でアクセス可能（prefix でマウント）
app.include_router(scripts.router, prefix="/scripts", tags=["scripts"])
app.include_router(hearing.router, prefix="/hearing", tags=["hearing"])


@app.get("/health")
async def health():
    """Cloudflare Tunnel / ローカル接続確認用"""
    return {"status": "ok", "service": "hybrid-scouter"}
