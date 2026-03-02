# Recode コーディングルール（AIエージェント向け）

本ドキュメントは、Gemini、Claude Code 等の AI エージェントがコードを生成・修正する際に守るべきルールを定義します。

---

## 1. 使用技術スタック

| カテゴリ | 技術 | 備考 |
|----------|------|------|
| フロントエンド | React 19, Next.js 15 (App Router) | "use client" はクライアントコンポーネントのみ |
| スタイリング | Tailwind CSS | ユーティリティファースト、カスタムクラスは最小限 |
| データベース | Turso (LibSQL) | **Drizzle / Prisma は未使用**。`@libsql/client` で生 SQL |
| サーバーサイド | Server Actions | "use server" でマーク、API Route は必要時のみ |
| パスワード | bcryptjs | 平文パスワードは絶対に保存しない |
| バックエンド | Python 3.11, FastAPI | apps/backend-ai/ |

---

## 2. UI/UX ルール

### 2.1 ワークスペース（Web アプリ）

- **デザイン**: 既存の `#2D2B2A`, `#827F7B`, `#4A463F`, `stone-*` パレットを維持
- **フォーム**: `px-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-300`
- **ボタン**: 主要アクションは `bg-[#4A463F]`、次要は `border border-stone-200`

### 2.2 Chrome 拡張機能（スカウター）

- **フォントサイズ**: `text-[10px]` を基準とする（コンパクトなサイドパネル用）
- **余白**: `p-2`, `py-1.5`, `space-y-1` 等の控えめなスペーシング
- **閲覧専用**: 拡張機能内での編集・削除ボタンは原則非表示（viewer として扱う）

### 2.3 レスポンシブ

- ワークスペースは `max-w-7xl mx-auto` で中央寄せ
- グリッドは `sm:grid-cols-2`, `lg:grid-cols-4` 等で段階的に拡張

---

## 3. セキュリティの鉄則

### 3.1 パスワード

- **必ず bcryptjs でハッシュ化**してから DB に保存
- 平文パスワードをログ・レスポンス・クライアントに含めない
- `getUsers` 等の一覧取得では `password_hash` を SELECT に含めない

### 3.2 認証情報

- **Turso**: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` は環境変数のみ。ハードコード禁止
- **R2**: `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` 同上
- **API キー**: `OPENAI_API_KEY`, `GOOGLE_AI_API_KEY` 同上

### 3.3 入力検証

- Server Action の引数は型チェックに加え、空文字・不正値の検証を行う
- SQL インジェクション対策: プレースホルダ `?` を使用、文字列連結でクエリ構築しない

---

## 4. SaaS化の前提

### 4.1 テナント分離の意識

- **常に「ユーザー・企業ごとにデータが分離されていること」を意識**
- 新規テーブル追加時は `user_id` または `tenant_id` の必要性を検討
- 既存テーブルへのカラム追加時も、将来的なマルチテナント対応を考慮

### 4.2 権限（role）

- `admin`: 作成・編集・削除・ユーザー管理が可能
- `viewer`: 閲覧のみ。編集 UI は `disabled` または非表示
- 権限チェックは `currentUserRole === 'admin'` で実施（認証導入後はセッションから取得）

### 4.3 レベル（level）

- `script_items.level`: 1=初級, 2=中級, 3=上級
- スカウターの「レベル制限」は `level <= selectedLevel` でフィルタ

---

## 5. データベース

### 5.1 マイグレーション

- スキーマ変更は `scripts/migrate-v*.ts` 形式のマイグレーションファイルを作成
- `ALTER TABLE ... ADD COLUMN` は `duplicate column name` で既存時はスキップ
- 実行コマンドは `package.json` の `scripts` に追加

### 5.2 クエリ

- `db.execute({ sql: "...", args: [...] })` 形式を使用
- `SELECT *` は必要なカラムのみ指定することを推奨（password_hash 等の除外）

---

## 6. ファイル配置

| 種類 | 配置先 |
|------|--------|
| Server Actions | `src/actions/` |
| ワークスペース用コンポーネント | `src/components/workspace/` |
| 録音関連コンポーネント | `src/components/recording/` |
| API Routes | `app/api/` |
| 型定義 | `src/types/` |
| DB スキーマ | `src/lib/db/schema.sql`, `schema-content.ts` |

---

## 7. 命名規則

- **コンポーネント**: PascalCase（例: `UserManager`, `TalkEditor`）
- **Server Actions**: camelCase、動詞で始める（例: `addUser`, `getUsers`）
- **DB カラム**: snake_case（例: `password_hash`, `created_at`）
- **環境変数**: UPPER_SNAKE_CASE（例: `TURSO_DATABASE_URL`）

---

## 8. 禁止事項

- パスワードの平文保存
- 認証情報のハードコード
- SQL の文字列連結（プレースホルダ必須）
- 拡張機能での `text-base` 等の大きいフォント（10px 基準を維持）
- `user_id` を無視した全件取得（マルチテナント化後の混在を防ぐ）
