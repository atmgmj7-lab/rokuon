# 本番環境デプロイガイド

システムを本番環境に移行するための手順です。

## アーキテクチャ概要

| コンポーネント | ローカル | 本番 |
|----------------|----------|------|
| ワークスペース（Next.js） | localhost:3002 | **Vercel**（GitHub push で自動デプロイ） |
| バックエンド（Python/FastAPI） | localhost:8765 | **Render** / **Railway** / **Cloudflare Tunnel** |
| スカウター（Chrome拡張） | localhost 向け | 本番バックエンドURL向けにビルド |

---

## 1. ワークスペース（Next.js）→ Vercel

GitHub の `main` ブランチに push すると、Vercel が自動でビルド・デプロイします。

- **確認**: [Vercel ダッシュボード](https://vercel.com/dashboard) でデプロイ状況を確認
- **環境変数**: Vercel の Project Settings → Environment Variables で以下を設定
  - `TURSO_DATABASE_URL`
  - `TURSO_AUTH_TOKEN`
  - `OPENAI_API_KEY`
  - `GOOGLE_AI_API_KEY`
  - その他（R2 等）

---

## 2. バックエンド（Python）の本番化

### オプション A: Render にデプロイ（推奨）

1. [Render](https://render.com) にログイン
2. **New → Web Service**
3. リポジトリを接続（GitHub の rokuon）
4. 設定:
   - **Root Directory**: `apps/backend-ai`
   - **Runtime**: Docker
   - **Dockerfile Path**: `./Dockerfile`（Root Directory からの相対パス）

5. **Environment Variables** を追加:
   | Key | Value |
   |-----|-------|
   | TURSO_DATABASE_URL | libsql://xxx.turso.io |
   | TURSO_AUTH_TOKEN | （トークン） |
   | GOOGLE_AI_API_KEY | （キー） |
   | OPENAI_API_KEY | sk-xxx |

6. **Deploy** をクリック
7. デプロイ完了後、**URL** をコピー（例: `https://hybrid-scouter-api.onrender.com`）

**注意**: `/scout` は Ollama が必要なため、クラウドでは動作しない場合があります。`/scripts`（Turso 同期）は動作します。

### オプション B: Railway にデプロイ

1. [Railway](https://railway.app) にログイン
2. **New Project → Deploy from GitHub**
3. リポジトリを選択し、**Root Directory** を `apps/backend-ai` に設定
4. **Variables** で環境変数を設定（Render と同様）
5. デプロイ後、**Generate Domain** で URL を取得

### オプション C: Cloudflare Tunnel（Mac M1 をサーバーにする）

Mac を 24 時間起動し、Cloudflare Tunnel で公開する方法。Ollama や mlx-whisper も利用可能。

詳細は [deployment.md](./deployment.md) を参照。

```bash
# クイックトンネル（開発・検証用）
cloudflared tunnel --url http://127.0.0.1:8765
# → https://xxxx.trycloudflare.com が発行される
```

---

## 3. スカウター（Chrome拡張）の本番ビルド

バックエンドの本番 URL をデフォルトにした拡張機能をビルドします。

### 3.1 本番用ビルド

```bash
cd apps/extension

# 本番バックエンド URL を指定してビルド
VITE_DEFAULT_ENDPOINT=https://your-backend.onrender.com \
VITE_APP_BASE_URL=https://your-app.vercel.app \
npm run build
```

- `VITE_DEFAULT_ENDPOINT`: バックエンドの本番 URL（Render/Railway/Cloudflare Tunnel）
- `VITE_APP_BASE_URL`: ワークスペースの本番 URL（Vercel）

### 3.2 拡張機能の読み込み

1. Chrome で `chrome://extensions` を開く
2. **デベロッパーモード** を ON
3. **パッケージ化されていない拡張機能を読み込む**
4. `apps/extension/dist` フォルダを選択

### 3.3 エンドポイントの変更（既にインストール済みの場合）

拡張機能のサイドパネル下部にある「API エンドポイント」入力欄に本番 URL を入力し、**保存** をクリック。  
（ストレージに保存されるため、ビルドし直さなくても切り替え可能）

---

## 4. 動作確認

| 確認項目 | 方法 |
|----------|------|
| ワークスペース | Vercel URL にアクセスし、ログイン・データ表示を確認 |
| バックエンド | `https://your-backend.onrender.com/health` にアクセス → `{"status":"ok"}` |
| 拡張機能 | サイドパネルを開き、接続ステータスが「同期済」になることを確認 |

---

## 5. トラブルシューティング

| 現象 | 対処 |
|------|------|
| 拡張機能が「オフライン」 | バックエンド URL が正しいか確認。manifest の host_permissions に URL のドメインが含まれているか確認 |
| CORS エラー | バックエンドの CORS 設定で `allow_origins=["*"]` が有効か確認 |
| /scripts が 503 | TURSO_DATABASE_URL, TURSO_AUTH_TOKEN が Render/Railway の環境変数に設定されているか確認 |
| /scout が 504 | Ollama はクラウドでは利用不可。Cloudflare Tunnel（Mac 起動）方式を検討 |
