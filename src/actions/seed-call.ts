"use server";

import {
  createSituationTag,
  linkItemToSituation,
} from "@/src/actions/call-actions";
import { getItemsByFolder } from "@/src/actions/workspace-actions";

export async function seedCallData() {
  try {
    console.log("🌱 ライブ・コーチング用サンプルデータを作成中...");

    // 状況タグを作成
    const tags = [
      // 相手の反応
      { name: "話を聞いてくれる", category: "相手の反応", description: "興味を持って聞いている" },
      { name: "忙しそう", category: "相手の反応", description: "時間がなさそう" },
      { name: "警戒している", category: "相手の反応", description: "営業と分かって身構えている" },
      { name: "質問してくる", category: "相手の反応", description: "積極的に質問してくる" },
      
      // Web状況
      { name: "HPなし", category: "Web状況", description: "ホームページが見つからない" },
      { name: "HPが古い", category: "Web状況", description: "更新されていない" },
      { name: "SNSのみ", category: "Web状況", description: "FacebookやInstagramのみ" },
      { name: "広告出稿中", category: "Web状況", description: "リスティング広告を出している" },
      
      // 属性
      { name: "代表の写真あり", category: "属性", description: "代表者の顔が分かる" },
      { name: "声が若い", category: "属性", description: "30代以下と推定" },
      { name: "創業5年以内", category: "属性", description: "比較的新しい会社" },
      { name: "従業員10名以下", category: "属性", description: "小規模企業" },
    ];

    const createdTags: { [key: string]: string } = {};

    for (const tag of tags) {
      const result = await createSituationTag(
        tag.name,
        tag.category,
        tag.description
      );
      if (result.success && result.tagId) {
        createdTags[tag.name] = result.tagId;
        console.log(`✓ タグ作成: ${tag.name}`);
      }
    }

    console.log(`✅ ${tags.length}個の状況タグを作成しました`);

    // ここでは、既存のトークアイテムに状況タグを紐付ける例を示します
    // 実際には、ワークスペースで作成されたトークアイテムのIDを取得して紐付けます

    return {
      success: true,
      message: `${tags.length}個の状況タグを作成しました。ワークスペースでトークアイテムに紐付けてください。`,
      tagIds: createdTags,
    };
  } catch (error) {
    console.error("❌ シードエラー:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "不明なエラー",
      tagIds: {},
    };
  }
}

// トークアイテムに状況タグを一括紐付け（ヘルパー関数）
export async function bulkLinkItemsToSituations(
  itemId: string,
  tagNames: string[],
  allTags: { [key: string]: string }
) {
  try {
    for (const tagName of tagNames) {
      const tagId = allTags[tagName];
      if (tagId) {
        await linkItemToSituation(itemId, tagId, 1);
      }
    }
    return { success: true };
  } catch (error) {
    console.error("❌ 一括紐付けエラー:", error);
    return { success: false };
  }
}
