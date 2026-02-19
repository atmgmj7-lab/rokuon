# Recode

## テレアポ音声自動文字起こし＆AI育成支援ツール

**「誰でもトップアポインターになれる」SaaS** の実現に向け、**ワークスペース統合版**と**リアクティブ・コール画面**が完成しました。

---

## 主な機能

### 🛠️ ワークスペース（統合版）
**1つの画面で全設定を管理**

#### 6つのメニュータブ
1. **📖 基本シナリオ**
   - 代表突破〜担当者接続までの固定トーク
   - 3層構造エディタ（ヒアリング内容・聞き方・狙い）
   - 返答パターンによる分岐管理

2. **🧩 部品トーク**
   - 状況タグに紐付け（特定の営業フェーズで表示）
   - チェック項目に紐付け（動的トリガー）
   - Quick Response設定（武器庫に常駐）
   - カテゴリ設定

3. **🎯 組み合わせトーク（タイムライン）**
   - 状況タグごとに使用するトークを組み立て
   - チェック項目も紐付け

4. **🎬 状況タグ管理**
   - 営業フェーズの定義（例: ヒアリング時、クロージング時）
   - アイコン・カラーの設定

5. **✅ チェック項目管理**
   - コール中に確認すべき項目を定義
   - カテゴリ別にグループ化

6. **📂 カテゴリ管理**
   - トークの分類（例: 断り文句、チャンストーク）

#### UX特徴
- **iPhoneライクなUI**: シンプルな削除・追加ボタン
- **明示的な保存ボタン**: 変更時に黄色の警告バーで表示
- **誤操作防止**: リアルタイム保存なし

### 📞 コール画面（実戦コックピット）
**武器庫から武器を取り出し、戦場で使います**

#### レイアウト
**上部: タブナビゲーション**
- 📖 基本シナリオ（固定タブ、デフォルト表示）
- ユーザーが作成した状況タグ

**中央: メイン会話エリア**
- 基本シナリオ or 状況別トークを表示
- **動的追加（リアクティブ機能）**:
  - チェック項目をON → 対応トークが瞬時に追加（アニメーション）
  - `NEW` バッジと緑色のリング、フェードイン
- アコーディオン展開（3層構造を確認）
- 分岐展開（顧客の返答ボタンで次のトークへ）

**右ペイン: 状況把握 & 武器庫**
- 上部: チェック項目（ON/OFF切り替え）
- 下部: Quick Response（武器庫）

---

## 技術スタック

- **フロントエンド**: Next.js 14+ (App Router), TypeScript, Tailwind CSS
- **データベース**: Turso (LibSQL)
- **AI**: OpenAI Whisper API (文字起こし), Google Gemini 1.5 Pro (多段階分析)
- **デプロイ**: Vercel

---

## データベース構造

### コアテーブル
- `script_items`: トーク本体（基本シナリオ & 部品トーク）
  - `item_type`: `'main_scenario'` or `'component'`
  - `target_situation_id`: 状況タグへの紐付け
  - `trigger_check_item_id`: チェック項目へのトリガー設定
  - `is_quick_response`: Quick Response表示フラグ
  - `category_id`: カテゴリ分類

- `item_responses`: 分岐管理（顧客の返答 → 次のトーク）

### マスターデータ
- `situations`: 状況タグ（営業フェーズ）
- `check_items`: チェック項目マスター
- `categories`: カテゴリ（動的作成）
- `timelines`: タイムライン（状況タグ × トークの組み合わせ）
- `timeline_blocks`: タイムライン × トークの紐付け
- `timeline_check_items`: タイムライン × チェック項目の紐付け

---

## セットアップ

### 1. 環境変数の設定
`.env` ファイルを作成し、以下を設定してください。

```env
TURSO_DATABASE_URL=libsql://xxx.turso.io
TURSO_AUTH_TOKEN=your_auth_token
OPENAI_API_KEY=sk-xxx
GOOGLE_API_KEY=xxx

# Cloudflare R2（音声ファイル保存用）
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=your-bucket-name
R2_PUBLIC_URL=https://your-bucket.your-domain.com
```

### 2. 依存関係のインストール
```bash
npm install
```

### 3. データベースのマイグレーション
```bash
npx tsx scripts/migrate-v10.ts
```

### 4. 開発サーバーの起動
```bash
npm run dev
```

http://localhost:3000 でアクセスできます。

---

## 使い方

### ワークスペース（準備）
1. 状況タグ、カテゴリ、チェック項目を作成
2. 基本シナリオを作成（代表突破用）
3. 部品トークを作成（状況・チェック項目に紐付け）
4. 組み合わせトーク（タイムライン）で統合
5. **保存ボタン**で確定

### コール画面（実戦）
1. 基本シナリオからスタート
2. チェック項目をON → トークが動的追加
3. 状況タブで切り替え（フェーズごと）
4. Quick Responseで想定外の質問に即対応

---

## プロジェクト構成

```
/app
  /page.tsx              # ホーム
  /workspace/page.tsx    # ワークスペース（統合版）
  /call/page.tsx         # コール画面
/src
  /actions
    /workspace-actions.ts  # Server Actions
  /components
    /recording/AudioUploader.tsx
  /lib
    /db/index.ts         # Turso クライアント
    /db/schema.sql       # スキーマ定義
  /types
    /workspace.ts        # TypeScript 型定義
/scripts
  /migrate-v10.ts        # 最新マイグレーション
```

---

## UXの特徴

### ワークスペース
- **iPhoneライクなUI**: シンプル・直感的
- **明示的な保存**: 変更検知 + 黄色の警告バー
- **誤操作防止**: リアルタイム保存なし

### コール画面
- **基本シナリオ固定**: 迷わず代表突破
- **動的トーク追加**: チェック項目で自動表示（アニメーション）
- **アコーディオン**: 必要な情報だけ展開
- **Quick Response**: 想定外の質問に即対応

---

## 今後の予定

- [ ] 音声分析機能の統合
- [ ] AI提案機能（Gemini）
- [ ] レポート機能（統計・分析）
- [ ] チーム管理機能
- [ ] モバイル最適化

---

## ライセンス

MIT

---

## 開発者

**成清孝史**

GitHub: https://github.com/atmgmj7-lab/rokuon
