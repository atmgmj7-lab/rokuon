/** 録音の音声種類（audio_category）の選択肢 */
export const AUDIO_CATEGORY_OPTIONS = [
  { value: "", label: "未設定" },
  { value: "会議", label: "会議" },
  { value: "商談", label: "商談" },
  { value: "メモ", label: "メモ" },
  { value: "指導", label: "指導" },
  { value: "その他", label: "その他" },
] as const;
