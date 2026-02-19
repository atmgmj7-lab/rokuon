# データ保存の仕組み調査 & 1000分収録時のコストシミュレーション

**作成日**: 2025年2月  
**対象プロジェクト**: rokuon（録音・文字起こし・分析アプリ）

---

## 1. 現在のデータ保存の仕組み

### 1.1 テキストデータ（Turso）

Turso（SQLite互換のエッジDB）に以下のテーブルが存在します。

| テーブル名 | 主な用途 | 主なカラム |
|-----------|----------|------------|
| **recordings** | 録音メタデータ | id, title, audio_url, duration, file_size, recording_type, parent_id, category, memo |
| **transcripts** | 文字起こし本文 | recording_id, content, language |
| **transcript_corrections** | 修正履歴（Whisperカンペ用） | recording_id, original_text, corrected_text |
| **user_dictionaries** | ユーザー辞書 | term, reading, category |
| **analysis_results** | 課題×指導の分析結果（JSON） | case_recording_id, feedback_recording_id, analysis_data, tags |
| **scripts** | スクリプト（カンペ） | title, flow_data |
| **script_logs** | スクリプト実行ログ | script_id, path_history, result_status |
| **knowledge_base** | ナレッジベース | category, title, content, tags |
| **script_categories** | 大カテゴリ | name, description |
| **script_folders** | フォルダ | category_id, name, folder_type |
| **script_items** | トーク内容 | folder_id, title, content |
| **item_responses** | 顧客返答パターン | parent_item_id, response_text, next_item_id |
| **categories** | 動的カテゴリ | name, color |
| **timelines** | タイムライン | title, description |
| **situation_tags** | 状況タグ | name, category |
| **item_situations** | トーク×状況の紐付け | item_id, situation_tag_id |

録音関連で容量を消費する主なテーブルは **recordings**, **transcripts**, **transcript_corrections**, **analysis_results** です。

---

### 1.2 音声データの保存先

| 項目 | 内容 |
|------|------|
| **保存先** | **Cloudflare R2**（S3互換API） |
| **実装** | `src/lib/r2.ts` の `uploadToR2` で `PutObjectCommand` によりアップロード |
| **参照** | `audio_url` に R2 の公開URL（`R2_PUBLIC_URL/uploads/xxx`）を格納 |
| **Vercel Blob / S3** | R2 を使用（S3互換のため `@aws-sdk/client-s3` を利用） |

---

### 1.3 使用している API

| API | 用途 | 使用箇所 |
|-----|------|----------|
| **OpenAI Whisper** | 音声の文字起こし | `recording-actions.ts`, `feedback-actions.ts` |
| **Google Gemini** | 文字起こしの整形・マージ・分析 | `format-actions.ts`, `analysis-actions.ts` |

- **formatCallTranscript**: Whisper 出力を JSON 配列に整形（gemini-2.0-flash 等）
- **mergeFeedbackIntoTranscript**: 課題音声と指導音声の文字起こしをマージ
- **analyzeFeedbackPair**: 課題×指導ペアの分析（**文字起こしテキストのみ**を送信、音声は送らない）

---

## 2. 1000分収録時の容量・コストシミュレーション

### 前提条件

- **収録時間**: 1000分（約16.6時間）
- **想定**: 100本の10分録音、または 200本の5分録音など、合計1000分
- **言語**: 日本語（テレアポ営業想定）

---

### 2.1 Turso（テキスト）の容量計算

| データ種別 | 1件あたりの目安 | 1000分相当の件数 | 推定容量 |
|------------|------------------|------------------|----------|
| recordings メタデータ | 〜0.5 KB | 100〜200件 | 〜0.1 MB |
| transcripts（文字起こし） | 日本語 約200文字/分 | 1000分分 | 〜0.4 MB |
| transcript_corrections | 〜0.2 KB/件 | 50〜100件 | 〜0.02 MB |
| analysis_results（JSON） | 〜2 KB/件 | 30〜50件 | 〜0.1 MB |
| **合計** | - | - | **約 0.6〜1 MB** |

#### Turso 無料枠との関係

| 項目 | 値 |
|------|-----|
| Turso 無料枠 | **5 GB** |
| 1000分相当のテキスト | 約 0.6〜1 MB |
| 無料枠に対する使用率 | **約 0.01〜0.02%** |

テキストデータのみであれば、1000分収録でも Turso 無料枠内で十分運用可能です。

> ※ 9 GB は Developer プラン（$4.99/月）のストレージです。無料枠は 5 GB です。

---

### 2.2 音声データの容量計算

音声は **Cloudflare R2** に保存されているため、1000分分の容量を試算します。

| 形式 | ビットレート | 1分あたり | 1000分 |
|------|--------------|-----------|--------|
| MP3 | 128 kbps | 約 1 MB | **約 1 GB** |
| M4A / WebM | 64–96 kbps | 約 0.5 MB | **約 0.5 GB** |

**1000分の音声合計: 約 0.5〜1 GB**

#### ストレージサービスのコスト（参考）

現在はローカル保存のため、Vercel 本番では永続化されません。外部ストレージに移行した場合の目安です。

| サービス | 無料枠 | 1000分（1 GB）時のコスト |
|---------|--------|---------------------------|
| **Vercel Blob** | 1 GB | 無料枠内で収まる可能性あり。超過後 $0.15/GB |
| **AWS S3** | 5 GB（12ヶ月） | 約 $0.023/GB → 約 $0.02〜0.03/月 |
| **Cloudflare R2** | 10 GB | 無料枠内 |

---

### 2.3 API 通信費用

#### Whisper（OpenAI）

| 項目 | 料金 |
|------|------|
| 単価 | **$0.006 / 分** |
| 1000分 | **$6.00（約 ¥900）** |

#### Gemini（Google）

| 処理 | モデル | 1回あたりの目安 | 1000分相当の回数 | 料金体系（1M tokens） | 概算 |
|------|--------|------------------|------------------|------------------------|------|
| formatCallTranscript | gemini-2.0-flash 等 | 入力 3K / 出力 3K tokens | 100〜200回 | $0.30 入力 / $2.50 出力 | 約 $0.50〜1.50 |
| mergeFeedbackIntoTranscript | 同上 | 入力 6K / 出力 4K tokens | 30〜50回 | 同上 | 約 $0.10〜0.30 |
| analyzeFeedbackPair | gemini-1.5-flash | 入力 2K / 出力 1K tokens | 30〜50回 | $0.075 入力 / $0.30 出力 | 約 $0.05〜0.15 |

**Gemini 合計: 約 $0.65〜2.00（約 ¥100〜300）**

---

### 2.4 1000分収録時の総コストまとめ

| 項目 | 概算費用（USD） | 概算費用（JPY） |
|------|-----------------|-----------------|
| Whisper（文字起こし） | $6.00 | 約 ¥900 |
| Gemini（整形・マージ・分析） | $0.65〜2.00 | 約 ¥100〜300 |
| Turso（テキスト） | $0（無料枠内） | ¥0 |
| 音声ストレージ（R2） | 無料枠10GB内 | ¥0 |
| **合計** | **約 $6.65〜8.00** | **約 ¥1,000〜1,200** |

※ 為替は 1 USD = 150 JPY で換算

---

## 3. 推奨事項

1. **音声の永続化**: 音声ファイルは **Cloudflare R2** に保存されるため、Vercel 本番環境でも永続化されます。
2. **Turso**: 1000分程度のテキストであれば無料枠で十分です。
3. **API コスト**: Whisper が大半を占めるため、長時間収録時は Whisper の利用量に注意してください。

---

*本レポートはコード解析に基づく推定値です。実際の料金は利用量・為替・各サービスの料金改定により変動します。*
