-- 録音データを保存するテーブル
CREATE TABLE IF NOT EXISTS recordings (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  audio_url TEXT NOT NULL,
  duration INTEGER NOT NULL,
  file_size INTEGER NOT NULL,
  -- 音声の種類: 'case' (課題音声), 'model' (お手本), 'feedback' (指導音声)
  recording_type TEXT NOT NULL DEFAULT 'case',
  -- 親録音のID（指導音声の場合、課題音声のIDが入る）
  parent_id TEXT,
  -- 業種・属性等の区分
  category_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (parent_id) REFERENCES recordings(id) ON DELETE CASCADE
);

-- ユーザーテーブル（将来的な拡張用）
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 録音のトランスクリプトを保存するテーブル
CREATE TABLE IF NOT EXISTS transcripts (
  id TEXT PRIMARY KEY,
  recording_id TEXT NOT NULL,
  content TEXT NOT NULL,
  language TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (recording_id) REFERENCES recordings(id) ON DELETE CASCADE
);

-- スクリプト（カンペ）を保存するテーブル
CREATE TABLE IF NOT EXISTS scripts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  -- 分岐ロジックをJSON形式で保存 (例: ノードID、テキスト、選択肢の配列)
  flow_data TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- スクリプト実行ログを保存するテーブル
CREATE TABLE IF NOT EXISTS script_logs (
  id TEXT PRIMARY KEY,
  script_id TEXT NOT NULL,
  -- どのルートを通ったかの配列をJSONで保存 (例: '["node_1", "node_2_a", "node_end"]')
  path_history TEXT NOT NULL,
  -- 最終的な結果 (例: "appointment", "rejected", "busy")
  result_status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (script_id) REFERENCES scripts(id)
);

-- 分析結果を保存するテーブル
CREATE TABLE IF NOT EXISTS analysis_results (
  id TEXT PRIMARY KEY,
  case_recording_id TEXT NOT NULL,
  feedback_recording_id TEXT NOT NULL,
  -- Geminiによる分析結果をJSON形式で保存
  analysis_data TEXT NOT NULL,
  -- 抽出されたタグ（業種、状況など）
  tags TEXT,
  -- 学習用ナレッジとして活用できるかのフラグ
  is_knowledge_base INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (case_recording_id) REFERENCES recordings(id) ON DELETE CASCADE,
  FOREIGN KEY (feedback_recording_id) REFERENCES recordings(id) ON DELETE CASCADE
);

-- ナレッジベース（静的なトーク集・戦略メモ）
CREATE TABLE IF NOT EXISTS knowledge_base (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL, -- 'objection' (断り文句), 'question' (質問集), 'hearing' (ヒアリング), 'key_talk' (さしどころ)
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  -- 業種・状況タグ
  tags TEXT,
  -- さしどころトークロジック（なぜこのトークが効くのか）
  logic_explanation TEXT,
  -- アポ獲得要因（Success Factors）
  success_factors TEXT,
  -- 次に何を聞くべきか（最短ルート）
  next_move_hint TEXT,
  -- 使用頻度・成功率など
  usage_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 階層構造ワークスペース用テーブル

-- 1. 大カテゴリ（例：建設業、IT企業など）
CREATE TABLE IF NOT EXISTS script_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at INTEGER NOT NULL
);

-- 2. フォルダ（基本トーク用、または状況別）
CREATE TABLE IF NOT EXISTS script_folders (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  name TEXT NOT NULL,
  folder_type TEXT NOT NULL, -- 'base_talk' (基本トーク: 中央ペインのタブ) または 'situational' (状況別: 右ペインの武器庫)
  sort_order INTEGER DEFAULT 0,
  is_visible_in_sidebar INTEGER DEFAULT 1, -- 1 = 表示, 0 = 非表示
  created_at INTEGER NOT NULL,
  FOREIGN KEY (category_id) REFERENCES script_categories(id) ON DELETE CASCADE
);

-- 3. 実際のトーク内容
CREATE TABLE IF NOT EXISTS script_items (
  id TEXT PRIMARY KEY,
  folder_id TEXT NOT NULL,
  title TEXT NOT NULL,
  -- ヒアリングすべき内容/目的
  hearing_purpose TEXT,
  -- 実際の聞き方（トーク本文）
  content TEXT NOT NULL,
  -- トップの狙い（戦略メモ）
  strategy_note TEXT,
  -- 次の一手
  next_move_hint TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (folder_id) REFERENCES script_folders(id) ON DELETE CASCADE
);

-- 顧客の返答パターン（分岐管理）
CREATE TABLE IF NOT EXISTS item_responses (
  id TEXT PRIMARY KEY,
  parent_item_id TEXT NOT NULL,
  response_text TEXT NOT NULL, -- 顧客の返答例（例：「高い」「必要ない」「興味ある」）
  next_item_id TEXT, -- この返答が来た際に展開する次のトークID
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (parent_item_id) REFERENCES script_items(id) ON DELETE CASCADE,
  FOREIGN KEY (next_item_id) REFERENCES script_items(id) ON DELETE SET NULL
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_recordings_created_at ON recordings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recordings_parent_id ON recordings(parent_id);
CREATE INDEX IF NOT EXISTS idx_recordings_type ON recordings(recording_type);
CREATE INDEX IF NOT EXISTS idx_transcripts_recording_id ON transcripts(recording_id);
CREATE INDEX IF NOT EXISTS idx_scripts_created_at ON scripts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_script_logs_script_id ON script_logs(script_id);
CREATE INDEX IF NOT EXISTS idx_script_logs_created_at ON script_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_case_recording ON analysis_results(case_recording_id);
CREATE INDEX IF NOT EXISTS idx_analysis_feedback_recording ON analysis_results(feedback_recording_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_tags ON knowledge_base(tags);
CREATE INDEX IF NOT EXISTS idx_script_folders_category ON script_folders(category_id);
CREATE INDEX IF NOT EXISTS idx_script_items_folder ON script_items(folder_id);
CREATE INDEX IF NOT EXISTS idx_script_folders_sort ON script_folders(sort_order);
CREATE INDEX IF NOT EXISTS idx_script_items_sort ON script_items(sort_order);

-- ========================================
-- Phase 9: 完全カスタマイズ対応
-- ========================================

-- 状況タグ（営業フェーズの定義）
CREATE TABLE IF NOT EXISTS situations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT DEFAULT '📌',
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- チェック項目マスター
CREATE TABLE IF NOT EXISTS check_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- タイムラインとチェック項目の紐付け
CREATE TABLE IF NOT EXISTS timeline_check_items (
  id TEXT PRIMARY KEY,
  timeline_id TEXT NOT NULL,
  check_item_id TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (timeline_id) REFERENCES timelines(id) ON DELETE CASCADE,
  FOREIGN KEY (check_item_id) REFERENCES check_items(id) ON DELETE CASCADE
);

-- ========================================
-- Phase 8: 動的カテゴリとタイムライン
-- ========================================

-- カテゴリ（動的カテゴリ管理）
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6B7280',
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- タイムライン（状況・シーン）
CREATE TABLE IF NOT EXISTS timelines (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- タイムラインブロック（タイムラインとトークの紐付け）
CREATE TABLE IF NOT EXISTS timeline_blocks (
  id TEXT PRIMARY KEY,
  timeline_id TEXT NOT NULL,
  script_item_id TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (timeline_id) REFERENCES timelines(id) ON DELETE CASCADE,
  FOREIGN KEY (script_item_id) REFERENCES script_items(id) ON DELETE CASCADE
);

-- ========================================
-- Phase 8: ライブ・コーチング（状況インプット）
-- ========================================

-- 状況タグ（「話を聞いてくれる」「HPが古い」など）
CREATE TABLE IF NOT EXISTS situation_tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- '相手の反応', 'Web状況', '属性' など
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- トークアイテムと状況タグの紐付け
CREATE TABLE IF NOT EXISTS item_situations (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  situation_tag_id TEXT NOT NULL,
  priority INTEGER DEFAULT 0, -- この状況でのこのトークの優先度
  created_at INTEGER NOT NULL,
  FOREIGN KEY (item_id) REFERENCES script_items(id) ON DELETE CASCADE,
  FOREIGN KEY (situation_tag_id) REFERENCES situation_tags(id) ON DELETE CASCADE
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_script_items_category ON script_items(category_id);
CREATE INDEX IF NOT EXISTS idx_script_items_quick_response ON script_items(is_quick_response);
CREATE INDEX IF NOT EXISTS idx_timeline_blocks_timeline ON timeline_blocks(timeline_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_situation_tags_category ON situation_tags(category, sort_order);
CREATE INDEX IF NOT EXISTS idx_item_situations_item ON item_situations(item_id);
CREATE INDEX IF NOT EXISTS idx_item_situations_tag ON item_situations(situation_tag_id);
CREATE INDEX IF NOT EXISTS idx_item_responses_parent ON item_responses(parent_item_id, sort_order);

-- ========================================
-- Phase 1: ユーザー辞書（文字起こし精度向上）
-- ========================================

-- 企業/ユーザー固有の専門用語を管理
CREATE TABLE IF NOT EXISTS user_dictionaries (
  id TEXT PRIMARY KEY,
  term TEXT NOT NULL,
  reading TEXT,
  category TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_dictionaries_term ON user_dictionaries(term);
CREATE INDEX IF NOT EXISTS idx_user_dictionaries_category ON user_dictionaries(category);
