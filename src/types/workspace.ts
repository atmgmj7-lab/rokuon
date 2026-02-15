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
  content: string;
  strategy_note?: string;
  next_move_hint?: string;
  sort_order: number;
  created_at: number;
  updated_at: number;
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
