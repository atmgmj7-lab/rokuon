# M1 Native Hybrid Scouter - Python Backend

Mac M1 (16GB) をAIサーバーとして活用する営業支援OSのバックエンド。**30秒以内**に外部情報を解析。

## 構成

- **Engine**: Ollama (gemma3:4b/12b, gemma2 フォールバック), mlx-whisper
- **スクレイピング**: Playwright 並列（Maps, HP, SNS=X, ポータル=企業概要・業績検索）
- **Hybrid Logic**: Gemma でWeb情報をクリーニング → **Gemini 1.5 Pro** / **GPT-4o** で「差しどころ」と「戦略」を生成
- **RAG**: Turso DB の knowledge_base, analysis_results を結合
- **Scripts API**: Turso DB の script_categories, script_folders, script_items を拡張機能と同期

## クイックスタート（推奨）

```bash
cd apps/backend-ai
./run.sh
```

`run.sh` が venv 作成・依存関係インストール・サーバー起動を自動で行います。

## 手動セットアップ

```bash
cd apps/backend-ai
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium
ollama pull gemma2:2b       # オプション: ローカルLLM用
```

## 環境変数

`.env` を作成し、以下を設定（差しどころ・戦略生成に必要）:

```
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=gemma2:2b
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-auth-token
GOOGLE_AI_API_KEY=your-google-ai-api-key
GEMINI_STRATEGY_MODEL=gemini-1.5-pro
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_STRATEGY_MODEL=gpt-4o
```

## 起動

```bash
source .venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8765 --reload
```

本番用: Cloudflare Tunnel で `https://your-tunnel.trycloudflare.com` に公開。

## Scripts API（トークスクリプト表示）

| メソッド | パス | 説明 |
|---------|------|------|
| GET | /scripts | 基本シナリオと部品トークを取得 |

- base_scenarios: folder_type='base_talk' のアイテム（電話の流れ）
- component_talks: folder_type='situational' のアイテム（カテゴリ別切り返し）

TURSO_DATABASE_URL と TURSO_AUTH_TOKEN が設定されている場合のみ有効。カテゴリ管理はワークスペース側で行う。
