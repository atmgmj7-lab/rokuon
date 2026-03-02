# Recode プロジェクト設計書（MCP / AIエージェント連携用）

本ドキュメントは、Gemini、Claude Code 等の AI エージェントがプロジェクトの文脈を理解し、一貫した開発を行うための設計書です。

---

## 1. アーキテクチャ構成

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              クライアント層                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Chrome 拡張機能（スカウター）          │  Web アプリ（Next.js）                     │
│  apps/extension/                     │  app/                                    │
│  - マップリサーチ・AI戦略              │  - ホーム (/)                             │
│  - 基本シナリオ・部品トーク表示         │  - ワークスペース (/workspace)              │
│  - アポヒアリング                     │  - コール画面 (/call)                      │
│  - レベル制限フィルタ（初級/中級/上級）  │  - 録音一覧・詳細                         │
│  ※ 閲覧専用（viewer）UI               │  ※ admin/viewer 権限で UI 出し分け          │
└──────────────┬───────────────────────┴────────────────┬────────────────────────┘
               │                                         │
               │ fetch(scripts, hearing)                 │ fetch(API Routes)
               │ fetch(scout, transcribe)                │ Server Actions
               ▼                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              サーバー層                                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Python バックエンド (FastAPI)          │  Next.js (App Router)                     │
│  apps/backend-ai/                     │  - API Routes: /api/upload-presigned,      │
│  - /scout: Web解析→AI戦略生成          │    /api/save-recording, /api/upload-*      │
│  - /transcribe: 音声文字起こし          │  - Server Actions: workspace-actions,     │
│  - /scripts: トーク取得 (Turso)        │    user-actions, recording-actions        │
│  - /hearing: ヒアリング取得            │  - デプロイ: Vercel                        │
│  - デプロイ: Render / Railway          │  - ポート: 3002 (dev)                      │
│  - ポート: 8765                        │                                            │
└──────────────┬───────────────────────┴────────────────┬────────────────────────┘
               │                                         │
               │ libsql (HTTP)                            │ @libsql/client
               ▼                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              データ層                                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Turso (LibSQL)                      │  Cloudflare R2 (S3互換)                    │
│  - recordings, transcripts           │  - 音声ファイル (uploads/*.mp3 等)          │
│  - users (email, password_hash, role) │  - 署名付き PUT URL でクライアント直接アップロード │
│  - script_items (level: 1/2/3)       │  - R2_PUBLIC_URL で公開URL生成              │
│  - script_folders, script_categories │                                            │
│  ※ Drizzle/Prisma は未使用、生SQL     │                                            │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### コンポーネント一覧

| コンポーネント | 技術 | デプロイ先 | 役割 |
|----------------|------|------------|------|
| Web アプリ | Next.js 15, React 19, Tailwind CSS | Vercel | ワークスペース、録音、コール画面 |
| バックエンド | Python 3.11, FastAPI | Render | 文字起こし、スクリプトAPI、スカウト |
| データベース | Turso (LibSQL) | Turso Cloud | 全データ永続化 |
| ストレージ | Cloudflare R2 | Cloudflare | 音声ファイル |
| 拡張機能 | React, Vite | Chrome Web Store / 手動読み込み | スカウター（営業支援） |

---

## 2. SaaS化の現状

### 2.1 ユーザー管理

| 項目 | 状態 | 備考 |
|------|------|------|
| users テーブル | ✅ 実装済み | id, email, name, password_hash, role |
| パスワードハッシュ | ✅ bcryptjs | SALT_ROUNDS=10 |
| ユーザー追加 | ✅ addUser | admin のみ操作可能 |
| ユーザー一覧 | ✅ getUsers | password_hash は除外 |
| ログイン・認証 | ❌ 未実装 | 現状 currentUserRole はハードコード |

### 2.2 権限（role）

| 値 | 意味 | UI の挙動 |
|----|------|-----------|
| admin | 管理者 | 作成・編集・削除可能、ユーザー管理タブ表示 |
| viewer | 閲覧者 | 一覧・詳細の閲覧のみ、編集不可 |

### 2.3 トークレベル（level）

| 値 | 意味 | 用途 |
|----|------|------|
| 1 | 初級 | 部品トークの難易度 |
| 2 | 中級 | スカウターで「レベル制限」フィルタに使用 |
| 3 | 上級 | 選択レベル以下のトークのみ表示 |

### 2.4 テナント分離の課題

⚠️ **現時点では user_id / tenant_id によるデータ分離は未実装**

- recordings, script_items, 等の主要テーブルに `user_id` カラムなし
- 複数企業・ユーザーが同一 DB を共有する前提での設計変更が今後の課題

---

## 3. 主要なデータフロー

### 3.1 録音データのアップロード〜保存

```
[ユーザー] 音声ファイル選択
    │
    ├─1. POST /transcribe (Python Backend)
    │      FormData: file
    │      → Whisper / mlx-whisper で文字起こし
    │      → { text, segments, duration } を返却
    │
    ├─2. POST /api/upload-presigned (Next.js)
    │      Body: { filename, contentType }
    │      → R2 署名付き PUT URL を発行
    │      → { putUrl, r2Key, audioUrl } を返却
    │
    ├─3. PUT putUrl (R2 直接)
    │      クライアントが音声ファイルを R2 に直接アップロード
    │      （Vercel のペイロード制限回避）
    │
    └─4. POST /api/save-recording (Next.js)
           Body: { r2Key, audioUrl, title, rawTranscript, duration, fileSize }
           → Turso: recordings + transcripts に INSERT
```

### 3.2 トークスクリプトの取得〜拡張機能での表示

```
[スカウター拡張機能]
    │
    ├─ GET /scripts (Python Backend)
    │     → Turso から script_items, script_folders を取得
    │     → { base_scenarios, component_talks: { カテゴリ: [{ title, content, level }] } }
    │
    ├─ レベル制限プルダウンでフィルタ
    │     compTalks = raw.filter(t => (t.level ?? 1) <= selectedCompLevelLimit)
    │
    └─ カテゴリ・トーク名ドロップダウンで選択表示
```

### 3.3 ワークスペースでのトーク編集

```
[ワークスペース /workspace]
    │
    ├─ Server Actions (workspace-actions.ts)
    │     createItem, updateItem, deleteItem, getItemsByFolder, ...
    │     → Turso に直接 CRUD
    │
    ├─ currentUserRole === 'admin' の場合のみ
    │     - 追加・削除・編集ボタン表示
    │     - ユーザー管理タブ表示
    │
    └─ script_items.level を部品トーク編集フォームで設定
```

---

## 4. ディレクトリ構造（主要部分）

```
rokuon/
├── app/                    # Next.js App Router
│   ├── page.tsx           # ホーム
│   ├── workspace/         # ワークスペース
│   ├── call/              # コール画面
│   └── api/               # API Routes
│       ├── upload-presigned/
│       ├── save-recording/
│       └── ...
├── src/
│   ├── actions/           # Server Actions
│   │   ├── workspace-actions.ts
│   │   ├── user-actions.ts
│   │   └── recording-actions.ts
│   ├── components/
│   │   ├── workspace/     # UserManager, HearingManager, ...
│   │   └── recording/     # AudioUploader, ...
│   ├── lib/
│   │   ├── db/            # Turso 接続、schema
│   │   ├── r2.ts          # R2 署名付きURL
│   │   └── transcribe.ts  # 文字起こし
│   └── types/
├── apps/
│   ├── backend-ai/        # Python FastAPI
│   │   ├── main.py
│   │   ├── routers/       # scout, transcribe, scripts, hearing
│   │   ├── Dockerfile
│   │   └── render.yaml
│   └── extension/        # Chrome 拡張機能
│       ├── src/App.tsx
│       ├── src/data/scripts.json  # オフライン用フォールバック
│       └── manifest.json
├── scripts/               # マイグレーション
│   ├── migrate.ts
│   ├── migrate-v17-role-level.ts
│   └── migrate-v18-users-password.ts
└── docs/
    └── mcp/               # 本設計書、ルール
```

---

## 5. 環境変数（主要）

| 変数 | 用途 | 設定先 |
|------|------|--------|
| TURSO_DATABASE_URL | Turso 接続 | .env, Vercel, Render |
| TURSO_AUTH_TOKEN | Turso 認証 | .env, Vercel, Render |
| R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY | R2 接続 | .env, Vercel |
| R2_BUCKET_NAME, R2_PUBLIC_URL | R2 バケット・公開URL | .env, Vercel |
| OPENAI_API_KEY | Whisper（Next.js 経由時） | .env, Vercel |
| GOOGLE_AI_API_KEY | Gemini | .env, Vercel, Render |
| NEXT_PUBLIC_API_URL | 録音アプリ→バックエンド | .env (本番: Render URL) |
| VITE_API_ENDPOINT, VITE_APP_BASE_URL | 拡張機能ビルド時 | apps/extension/.env |

---

## 6. 今後の開発フェーズ（参考）

1. **ログイン・セッション**: Server Actions + ミドルウェアで保護
2. **user_id によるデータ分離**: 全主要テーブルに user_id 追加、クエリに WHERE 付与
3. **R2 キー設計**: `uploads/{user_id}/{timestamp}.mp3` 等のテナント分離
