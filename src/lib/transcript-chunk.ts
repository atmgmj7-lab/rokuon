/**
 * トランスクリプトの5文チャンク化ユーティリティ
 * 句点（。！？）で分割し、指定数ごとに1つのパラグラフにまとめる
 */

const SENTENCE_END_REGEX = /([。！？]+)/g;

/**
 * テキストを文単位に分割する（句点を含める）
 * 例: "こんにちは。今日は良い天気です！" → ["こんにちは。", "今日は良い天気です！"]
 */
export function splitIntoSentences(text: string): string[] {
  if (!text?.trim()) return [];
  const parts = text.split(SENTENCE_END_REGEX);
  const sentences: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (!p) continue;
    // 句点のみの部分は直前の文に結合
    if (/^[。！？]+$/.test(p)) {
      if (sentences.length > 0) {
        sentences[sentences.length - 1] += p;
      } else {
        sentences.push(p);
      }
    } else {
      const trimmed = p.trim();
      if (trimmed) {
        const nextPart = parts[i + 1];
        if (nextPart && /^[。！？]+$/.test(nextPart)) {
          sentences.push(trimmed + nextPart);
          i++; // 句点を消費
        } else {
          sentences.push(trimmed);
        }
      }
    }
  }
  return sentences.length > 0 ? sentences : [text.trim()];
}

/**
 * テキストを指定文数ごとにチャンク化する
 * @param text 元のテキスト
 * @param sentencesPerChunk 1チャンクあたりの文数（デフォルト5）
 * @returns チャンクの配列
 */
export function chunkTextBySentences(
  text: string,
  sentencesPerChunk: number = 5
): string[] {
  const sentences = splitIntoSentences(text);
  if (sentences.length === 0) return [];
  const chunks: string[] = [];
  for (let i = 0; i < sentences.length; i += sentencesPerChunk) {
    const chunk = sentences.slice(i, i + sentencesPerChunk).join("");
    if (chunk.trim()) chunks.push(chunk.trim());
  }
  return chunks.length > 0 ? chunks : [text.trim()];
}

/**
 * チャンク配列を元のテキストに復元する
 * （編集後のチャンクを結合）
 */
export function joinChunks(chunks: string[]): string {
  return chunks.join("");
}
