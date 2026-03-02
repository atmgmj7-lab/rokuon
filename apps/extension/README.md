# Hybrid AI Scouter - Chrome Extension

営業支援OS用 Chrome 拡張機能（Manifest V3）。Side Panel API で **Web解析サマリー → AI戦略ボード → 既存トークスクリプト** を表示。

## 技術スタック

- **React** + **Tailwind CSS**
- **Vite** ビルド
- **Side Panel API**（Chrome 114+）

## 機能

- **Content Script**: アクティブタブから企業名を自動抽出（選択テキスト優先、ページ内の「株式会社」等パターン）
- **[A] スカウトトリガー**: 抽出した企業名を Input に表示し、「スカウト開始」クリック時のみ API 呼び出し（自動暴発防止）
- **[B] プログレッシブステータス**: 解析中（最大28秒）は「🔍 Web情報収集中...」→「🧠 Gemma 3 クリーニング中...」→「⚡ 最終戦略を構築中...」と数秒ごとにメッセージ切り替え
- **[C] AI戦略ボード**: マップ順位/露出度、差しどころ、具体的な提案トークを視覚的に強調表示
- **[D] アプリ内カンペ**: Turso の knowledge_base（RAG）を最下部に表示
- **[E] ネクストアクション**: 「この戦略で録音を開始」で Next.js アプリ（`/?company=...&strategy=...`）に遷移

## ビルド・インストール

```bash
cd apps/extension
npm install
npm run build
```

1. Chrome で `chrome://extensions` を開く
2. 「デベロッパーモード」を有効化
3. 「パッケージ化されていない拡張機能を読み込む」→ **`apps/extension/dist`** フォルダを選択

## 環境変数（本番ビルド用）

ビルド時に API URL を切り替えるには `.env` を使用:

```bash
# .env.example をコピーして編集
cp .env.example .env

# 本番用 URL に書き換え（例）
# VITE_API_ENDPOINT=https://your-backend.onrender.com
# VITE_APP_BASE_URL=https://your-app.vercel.app

npm run build
```

| 変数 | 説明 | ローカル | 本番 |
|------|------|----------|------|
| VITE_API_ENDPOINT | バックエンド API URL | http://localhost:8765 | https://api.yourdomain.com |
| VITE_APP_BASE_URL | 録音アプリ（ワークスペース）URL | http://127.0.0.1:3002 | https://app.yourdomain.com |

未設定時はローカル用のデフォルトが使われます。

## 設定

- **API エンドポイント**: ローカル `http://localhost:8765` または本番 URL（サイドパネル下部で保存可能）
- **録音アプリURL**: Next.js アプリのベース URL（デフォルト: `http://127.0.0.1:3002`）

## エラーハンドリング

- **504 (Timeout)**: 「情報の取得に時間がかかりました。ローカルのGemma 3が起動しているか確認してください」
- **500**: バックエンド起動確認を促すメッセージを表示

## manifest.json の CSP / host_permissions

本番用外部 API（https）へのアクセスを許可するため、以下が設定済み:

- **host_permissions**: `https://*/*` で任意の https を許可。`https://api.yourdomain.com/*` はプレースホルダー（本番 URL 確定後に書き換え可）
- **connect-src**: `https:` で全 https 接続を許可。本番ドメインを追加する場合は `https://your-api-domain.com` を追記

## 前提

- Python バックエンド (`apps/backend-ai`) が `http://localhost:8765` で起動していること
- 本番: Cloudflare Tunnel / Render / Railway でバックエンドを公開し、その URL を `.env` の `VITE_API_ENDPOINT` に設定
