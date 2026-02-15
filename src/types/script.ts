// 仮説タグの型定義
export interface HypothesisTags {
  hp?: "none" | "sns_only" | "ads_active"; // Web状況
  hiring?: "active" | "none"; // 求人状況
  target?: "ceo" | "manager"; // ターゲット
  personality?: "logical" | "emotional"; // パーソナリティ
}

// スクリプトノードの型定義
export interface ScriptNode {
  id: string;
  type: "message" | "question" | "end" | "start"; // startタイプを追加
  content: string; // 表示するメッセージ
  options?: ScriptOption[]; // 選択肢（questionタイプの場合）
  position?: { x: number; y: number }; // ビジュアルエディタでの位置
  hypothesis_tags?: HypothesisTags; // 開始ノードの属性フィルター
  strategy_note?: string; // トップアポインターの戦略メモ（なぜこのトークが効くのか）
  next_move_hint?: string; // 次に何を聞くべきか（勝ちパターンへの最短ルート）
}

// 選択肢の型定義
export interface ScriptOption {
  id: string;
  label: string; // 選択肢のラベル（例: "興味あり", "興味なし"）
  nextNodeId: string; // 次に表示するノードのID
}

// スクリプト全体のフローデータ
export interface ScriptFlowData {
  startNodeId: string; // 開始ノードのID（デフォルト）
  nodes: ScriptNode[]; // すべてのノード
  startNodes?: string[]; // 複数の開始ノードID（属性別）
}

// データベースから取得するスクリプト
export interface Script {
  id: string;
  title: string;
  flow_data: string; // JSON文字列
  created_at: number;
  updated_at: number;
}

// パースされたスクリプト（使いやすい形）
export interface ParsedScript {
  id: string;
  title: string;
  flowData: ScriptFlowData;
  created_at: number;
  updated_at: number;
}

// スクリプト実行ログ
export interface ScriptLog {
  id: string;
  script_id: string;
  path_history: string; // JSON文字列
  result_status: string;
  created_at: number;
}

// パースされたスクリプトログ（使いやすい形）
export interface ParsedScriptLog {
  id: string;
  script_id: string;
  pathHistory: string[]; // ノードIDの配列
  result_status: string;
  created_at: number;
}

// AI提案の型定義
export interface ScriptProposal {
  id: string;
  title: string;
  description: string;
  proposedNode: ScriptNode;
  sourceAnalysisId?: string; // 元になった分析結果のID
}

// ナレッジベースの型定義
export interface KnowledgeBase {
  id: string;
  category: "objection" | "question" | "hearing" | "key_talk";
  title: string;
  content: string;
  tags?: string;
  logic_explanation?: string; // さしどころトークロジック
  success_factors?: string; // アポ獲得要因
  next_move_hint?: string; // 次の一手
  usage_count: number;
  success_count: number;
  created_at: number;
  updated_at: number;
}
