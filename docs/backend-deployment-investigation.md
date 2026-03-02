# AIバックエンド（apps/backend-ai）本番デプロイ状況 調査レポート

## 1. デプロイ用設定ファイルの有無

### ✅ 確認できたファイル

| ファイル | 場所 | 内容 |
|----------|------|------|
| **render.yaml** | `apps/backend-ai/render.yaml` | Render Blueprint 設定。サービス名: `hybrid-scouter-api` |
| **Dockerfile** | `apps/backend-ai/Dockerfile` | Docker ビルド用。Render / Railway 等のクラウドデプロイに対応 |
| **.dockerignore** | `apps/backend-ai/.dockerignore` | Docker ビルド時の除外設定 |

### render.yaml の主な内容

- **サービス名**: `hybrid-scouter-api`
- **ランタイム**: Docker
- **環境変数**: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, GOOGLE_AI_API_KEY, OPENAI_API_KEY, OLLAMA_HOST, PORT

### 想定される本番URL（Render デプロイ時）

Render にデプロイした場合、通常は次の形式の URL が発行されます。

```
https://hybrid-scouter-api.onrender.com
```

※実際にデプロイ済みかどうかは、Render ダッシュボードで確認する必要があります。

---

## 2. 環境変数・定数に設定された「本番用URL」の捜索結果

### 拡張機能（apps/extension）

| ファイル | 設定内容 |
|----------|----------|
| `.env.production` | `VITE_APP_BASE_URL=https://rokuon-ivory.vercel.app`（**ワークスペースURL**。AIバックエンドではない） |
| `.env.example` | `VITE_API_ENDPOINT=https://api.yourdomain.com`（プレースホルダー） |
| `src/App.tsx` | `DEFAULT_ENDPOINT = "http://localhost:8765"`（ローカル用デフォルト） |

**結論**: AIバックエンドの本番URLは、コード内にハードコードされていません。拡張機能のサイドパネル下部の「接続先」入力欄で、ユーザーが手動で設定・保存する想定です。

### Next.js（app/api/ext/scout 等）

| ファイル | 設定内容 |
|----------|----------|
| `app/api/ext/scout/route.ts` | `PYTHON_API_URL = process.env.NEXT_PUBLIC_API_URL \|\| "http://127.0.0.1:8765"` |
| `.env.example` | `NEXT_PUBLIC_API_URL=http://127.0.0.1:8765`（ローカル用） |

**結論**: 本番用の `NEXT_PUBLIC_API_URL` は、Vercel の環境変数で設定する必要があります。リポジトリ内には本番URLの記載はありません。

### 確認できた本番用URL

- **ワークスペース（Next.js）**: `https://rokuon-ivory.vercel.app`（Vercel 本番）
- **AIバックエンド（Python）**: リポジトリ内に**具体的な本番URLは見当たりません**

---

## 3. AIバックエンド側のCORS設定

### 確認結果（apps/backend-ai/main.py）

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**結論**: `allow_origins=["*"]` により、**すべてのオリジン**が許可されています。

- Vercel ドメイン（`https://rokuon-ivory.vercel.app`）は自動的に許可されます
- Chrome 拡張機能（`chrome-extension://...`）からのリクエストも許可されます
- 追加の CORS 設定は不要です

---

## 総合レポート

### デプロイの痕跡

- **Render 用の設定ファイル（render.yaml, Dockerfile）は存在**します
- デプロイ手順は `docs/deployment-production.md` に記載されています
- ただし、**実際に Render 等へデプロイ済みかどうかは、リポジトリからは判断できません**

### 本番用URLの状況

| コンポーネント | 本番URL | 状況 |
|----------------|---------|------|
| ワークスペース（Next.js） | `https://rokuon-ivory.vercel.app` | ✅ 設定済み |
| AIバックエンド（Python） | 未特定 | ⚠️ リポジトリ内に記載なし |

### 推奨アクション

1. **Render ダッシュボードを確認**  
   - [Render Dashboard](https://dashboard.render.com) で `hybrid-scouter-api` サービスが存在するか確認
   - 存在する場合、発行された URL（例: `https://hybrid-scouter-api.onrender.com`）をメモ

2. **本番URLの設定**  
   - Vercel: `NEXT_PUBLIC_API_URL` に AIバックエンドの本番URLを設定
   - 拡張機能: サイドパネル下部の「接続先」に同じURLを入力して保存
   - USER_MANUAL.md: 管理者が `[AIバックエンドのURL]` を実際のURLに置き換え

3. **デプロイ未実施の場合**  
   - `docs/deployment-production.md` の手順に従い、Render または Railway へデプロイ
   - デプロイ完了後、上記2の設定を行う
