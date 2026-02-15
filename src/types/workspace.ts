// 階層構造ワークスペースの型定義

// カテゴリ（大分類）
export interface ScriptCategory {
  id: string;
  name: string;
  description?: string;
  created_at: number;
}

// フォルダ（中分類）
export interface ScriptFolder {
  id: string;
  category_id: string;
  name: string;
  folder_type: "base_talk" | "situational"; // display_typeに相当
  sort_order: number;
  is_visible_in_sidebar: number; // 1 = 表示, 0 = 非表示
  created_at: number;
}

// トークアイテム（実際のトーク内容）
export interface ScriptItem {
  id: string;
  folder_id: string;
  title: string;
  hearing_purpose?: string; // ヒアリングすべき内容/目的
  content: string; // 実際の聞き方
  strategy_note?: string; // トップの狙い
  next_move_hint?: string;
  category_id?: string; // 動的カテゴリ
  is_quick_response: number; // Quick Responseに表示するか（0 or 1）
  item_type: string; // 'main_scenario' or 'component'
  target_situation_id?: string; // どの状況タブで表示するか
  trigger_check_item_id?: string; // どのチェック項目がONになったら表示するか
  sort_order: number;
  created_at: number;
  updated_at: number;
}

// 顧客の返答パターン（分岐）
export interface ItemResponse {
  id: string;
  parent_item_id: string;
  response_text: string; // 顧客の返答例（例：「高い」「必要ない」「興味ある」）
  next_item_id?: string; // この返答が来た際に展開する次のトークID
  sort_order: number;
  created_at: number;
}

// カテゴリ（動的カテゴリ管理）
export interface Category {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  created_at: number;
}

// タイムライン（状況・シーン）
export interface Timeline {
  id: string;
  title: string;
  description?: string;
  situation_id?: string; // 状況タグへの紐付け
  sort_order: number;
  created_at: number;
}

// タイムラインブロック（タイムラインとトークの紐付け）
export interface TimelineBlock {
  id: string;
  timeline_id: string;
  script_item_id: string;
  sort_order: number;
  created_at: number;
}

// 状況タグ
export interface Situation {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  sort_order: number;
  created_at: number;
}

// チェック項目
export interface CheckItem {
  id: string;
  name: string;
  description?: string;
  category?: string;
  sort_order: number;
  created_at: number;
}

// タイムラインとチェック項目の紐付け
export interface TimelineCheckItem {
  id: string;
  timeline_id: string;
  check_item_id: string;
  sort_order: number;
  created_at: number;
}

// 階層構造全体（表示用）
export interface WorkspaceHierarchy {
  categories: Array<{
    category: ScriptCategory;
    folders: Array<{
      folder: ScriptFolder;
      items: ScriptItem[];
    }>;
  }>;
}
