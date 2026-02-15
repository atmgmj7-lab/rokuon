// 状況タグ（「話を聞いてくれる」「HPが古い」など）
export interface SituationTag {
  id: string;
  name: string;
  category: string; // '相手の反応', 'Web状況', '属性' など
  description?: string;
  sort_order: number;
  created_at: number;
}

// トークアイテムと状況タグの紐付け
export interface ItemSituation {
  id: string;
  item_id: string;
  situation_tag_id: string;
  priority: number; // この状況でのこのトークの優先度
  created_at: number;
}

// トークアイテム（script_items）の拡張版
export interface EnrichedScriptItem {
  id: string;
  folder_id: string;
  title: string;
  content: string;
  strategy_note?: string;
  next_move_hint?: string;
  sort_order: number;
  created_at: number;
  updated_at: number;
  // 紐付けられた状況タグ
  situation_tags?: SituationTag[];
  // この状況でのマッチ度（スコア）
  match_score?: number;
}

// カテゴリ別の状況タグ
export interface SituationTagsByCategory {
  category: string;
  tags: SituationTag[];
}
