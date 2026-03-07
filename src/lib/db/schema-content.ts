/**
 * スキーマSQLを文字列としてエクスポート
 * scripts/migrate.ts で使用（fs モジュールを使わず Vercel サーバーレスで安全）
 */
export const SCHEMA_SQL = `
-- 録音データを保存するテーブル
CREATE TABLE IF NOT EXISTS recordings (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  audio_url TEXT NOT NULL,
  duration INTEGER NOT NULL,
  file_size INTEGER NOT NULL,
  recording_type TEXT NOT NULL DEFAULT 'case',
  parent_id TEXT,
  category_id TEXT,
  memo TEXT,
  category TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (parent_id) REFERENCES recordings(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT,
  role TEXT DEFAULT 'viewer',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS transcripts (
  id TEXT PRIMARY KEY,
  recording_id TEXT NOT NULL,
  content TEXT NOT NULL,
  language TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (recording_id) REFERENCES recordings(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS scripts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  flow_data TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS script_logs (
  id TEXT PRIMARY KEY,
  script_id TEXT NOT NULL,
  path_history TEXT NOT NULL,
  result_status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (script_id) REFERENCES scripts(id)
);

CREATE TABLE IF NOT EXISTS analysis_results (
  id TEXT PRIMARY KEY,
  case_recording_id TEXT NOT NULL,
  feedback_recording_id TEXT NOT NULL,
  analysis_data TEXT NOT NULL,
  tags TEXT,
  is_knowledge_base INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (case_recording_id) REFERENCES recordings(id) ON DELETE CASCADE,
  FOREIGN KEY (feedback_recording_id) REFERENCES recordings(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS knowledge_base (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT,
  logic_explanation TEXT,
  success_factors TEXT,
  next_move_hint TEXT,
  usage_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS script_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS script_folders (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  name TEXT NOT NULL,
  folder_type TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_visible_in_sidebar INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (category_id) REFERENCES script_categories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS script_items (
  id TEXT PRIMARY KEY,
  folder_id TEXT NOT NULL,
  title TEXT NOT NULL,
  hearing_purpose TEXT,
  content TEXT NOT NULL,
  strategy_note TEXT,
  next_move_hint TEXT,
  level INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (folder_id) REFERENCES script_folders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS item_responses (
  id TEXT PRIMARY KEY,
  parent_item_id TEXT NOT NULL,
  response_text TEXT NOT NULL,
  next_item_id TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (parent_item_id) REFERENCES script_items(id) ON DELETE CASCADE,
  FOREIGN KEY (next_item_id) REFERENCES script_items(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS situations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT DEFAULT '📌',
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS check_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6B7280',
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS timelines (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS timeline_blocks (
  id TEXT PRIMARY KEY,
  timeline_id TEXT NOT NULL,
  script_item_id TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (timeline_id) REFERENCES timelines(id) ON DELETE CASCADE,
  FOREIGN KEY (script_item_id) REFERENCES script_items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS timeline_check_items (
  id TEXT PRIMARY KEY,
  timeline_id TEXT NOT NULL,
  check_item_id TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (timeline_id) REFERENCES timelines(id) ON DELETE CASCADE,
  FOREIGN KEY (check_item_id) REFERENCES check_items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS situation_tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS item_situations (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  situation_tag_id TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (item_id) REFERENCES script_items(id) ON DELETE CASCADE,
  FOREIGN KEY (situation_tag_id) REFERENCES situation_tags(id) ON DELETE CASCADE
);

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
CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_timeline_blocks_timeline ON timeline_blocks(timeline_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_situation_tags_category ON situation_tags(category, sort_order);
CREATE INDEX IF NOT EXISTS idx_item_situations_item ON item_situations(item_id);
CREATE INDEX IF NOT EXISTS idx_item_situations_tag ON item_situations(situation_tag_id);
CREATE INDEX IF NOT EXISTS idx_item_responses_parent ON item_responses(parent_item_id, sort_order);

CREATE TABLE IF NOT EXISTS user_dictionaries (
  id TEXT PRIMARY KEY,
  term TEXT NOT NULL,
  reading TEXT,
  category TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_dictionaries_term ON user_dictionaries(term);
CREATE INDEX IF NOT EXISTS idx_user_dictionaries_category ON user_dictionaries(category);

CREATE TABLE IF NOT EXISTS transcript_corrections (
  id TEXT PRIMARY KEY,
  recording_id TEXT NOT NULL,
  transcript_id TEXT,
  original_text TEXT NOT NULL,
  corrected_text TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (recording_id) REFERENCES recordings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_transcript_corrections_recording_id ON transcript_corrections(recording_id);
CREATE INDEX IF NOT EXISTS idx_transcript_corrections_created_at ON transcript_corrections(created_at DESC);

CREATE TABLE IF NOT EXISTS regions (
  id TEXT PRIMARY KEY,
  prefecture TEXT NOT NULL,
  city TEXT NOT NULL,
  yomigana TEXT,
  population INTEGER,
  search_volume INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_regions_prefecture ON regions(prefecture);
CREATE UNIQUE INDEX IF NOT EXISTS idx_regions_prefecture_city ON regions(prefecture, city);

-- 業種キーワード × 地域の月間検索ボリューム（regions の search_volume とは別管理）
CREATE TABLE IF NOT EXISTS region_keywords (
  id TEXT PRIMARY KEY,
  prefecture TEXT NOT NULL,
  city TEXT NOT NULL,
  keyword TEXT NOT NULL,
  search_volume INTEGER,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_region_keywords_city ON region_keywords(city);
CREATE UNIQUE INDEX IF NOT EXISTS idx_region_keywords_city_keyword ON region_keywords(prefecture, city, keyword);

-- マインドマップ
CREATE TABLE IF NOT EXISTS mind_maps (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_mind_maps_user_id ON mind_maps(user_id);

-- マインドマップ ノード (node_type: 'script_item' | 'text' | 'recording' | 'section')
CREATE TABLE IF NOT EXISTS map_nodes (
  id TEXT PRIMARY KEY,
  map_id TEXT NOT NULL,
  node_type TEXT NOT NULL,
  script_item_id TEXT,
  title TEXT,
  label TEXT NOT NULL,
  content TEXT,
  audio_url TEXT,
  r2_key TEXT,
  parent_id TEXT,
  color TEXT DEFAULT '#3B82F6',
  pos_x REAL DEFAULT 0,
  pos_y REAL DEFAULT 0,
  width REAL DEFAULT 200,
  height REAL DEFAULT 80,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (map_id) REFERENCES mind_maps(id) ON DELETE CASCADE,
  FOREIGN KEY (script_item_id) REFERENCES script_items(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_map_nodes_map_id ON map_nodes(map_id);
CREATE INDEX IF NOT EXISTS idx_map_nodes_parent_id ON map_nodes(parent_id);

-- マインドマップ エッジ（ノード間接続）
CREATE TABLE IF NOT EXISTS map_edges (
  id TEXT PRIMARY KEY,
  map_id TEXT NOT NULL,
  source_node_id TEXT NOT NULL,
  target_node_id TEXT NOT NULL,
  label TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (map_id) REFERENCES mind_maps(id) ON DELETE CASCADE,
  FOREIGN KEY (source_node_id) REFERENCES map_nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (target_node_id) REFERENCES map_nodes(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_map_edges_map_id ON map_edges(map_id);
`;
