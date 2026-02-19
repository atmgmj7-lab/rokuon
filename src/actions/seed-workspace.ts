"use server";

import {
  createCategory,
  createFolder,
  createItem,
} from "@/src/actions/workspace-actions";

export async function seedWorkspace() {
  try {
    console.log("🌱 ワークスペースのシード開始...");

    // カテゴリ1: IT企業
    const itResult = await createCategory("IT企業", "SaaS、Webサービス企業向け");
    if (!itResult.success) throw new Error("IT企業カテゴリ作成失敗");
    const itCategoryId = itResult.categoryId!;

    // フォルダ: 新規架電用（基本トーク）
    const newCallResult = await createFolder(itCategoryId, "新規架電用", "base_talk", 0, 1);
    if (!newCallResult.success) throw new Error("新規架電用フォルダ作成失敗");
    const newCallFolderId = newCallResult.folderId!;

    // アイテム: 挨拶
    await createItem(
      newCallFolderId,
      "挨拶と自己紹介",
      "お世話になっております。〇〇株式会社の△△と申します。\n\n本日は、貴社のDX推進についてご提案がございまして、お電話させていただきました。",
      "会社名と提案内容を簡潔に伝える（経営課題に直結するキーワードを含める）",
      "最初の15秒で興味を引くため、「DX推進」という経営課題に直結するキーワードを使う。",
      "時間確認に移行。「2-3分」という具体的な時間を提示して心理的ハードルを下げる。",
      "component",
      undefined,
      undefined,
      0
    );

    // アイテム: 時間確認
    await createItem(
      newCallFolderId,
      "時間確認",
      "今、2-3分ほどお時間よろしいでしょうか？",
      "相手の時間的余裕を確認する（具体的な時間を提示）",
      "具体的な時間を提示することで、相手は「それくらいなら...」と思いやすい。",
      "OK → ヒアリングへ / NG → 「1分だけなら？」と譲歩案を提示",
      "component",
      undefined,
      undefined,
      1
    );

    // フォルダ: 再架電用（基本トーク）
    const recallResult = await createFolder(itCategoryId, "再架電用", "base_talk", 1, 1);
    if (!recallResult.success) throw new Error("再架電用フォルダ作成失敗");
    const recallFolderId = recallResult.folderId!;

    // アイテム: 再架電挨拶
    await createItem(
      recallFolderId,
      "再架電の挨拶",
      "お世話になっております。先日お電話させていただいた〇〇株式会社の△△です。\n\nその後、ご検討状況はいかがでしょうか？",
      "前回の提案の進捗を確認する（検討してくれている前提で話す）",
      "前回の続きであることを明示し、「検討してくれている」前提で話すことで、断りにくくさせる。",
      "「前回お話しした〇〇の件ですが」と具体的に振り返り、記憶を呼び起こす。",
      "component",
      undefined,
      undefined,
      0
    );

    // フォルダ: 断り文句（状況別）
    const objectionResult = await createFolder(itCategoryId, "断り文句", "situational", 0, 1);
    if (!objectionResult.success) throw new Error("断り文句フォルダ作成失敗");
    const objectionFolderId = objectionResult.folderId!;

    // アイテム: 忙しい
    await createItem(
      objectionFolderId,
      "「忙しい」への切り返し",
      "承知いたしました。お忙しいところ失礼いたしました。\n\nただ、1分だけお時間をいただければ、なぜ今お電話したのか、その理由だけでもお伝えさせていただけませんか？\n\nもし興味がなければ、すぐに切っていただいて構いません。",
      "「忙しい」という断りに対して、1分だけ時間をもらう",
      "「1分だけ」で心理的ハードルを下げる。「切って構いません」で逃げ道を作り、相手の警戒心を解く。",
      "1分経過後、「実は〇〇という課題をお持ちではありませんか？」と具体的な課題提起に移行。",
      "component",
      undefined,
      undefined,
      0
    );

    // アイテム: 必要ない
    await createItem(
      objectionFolderId,
      "「必要ない」への切り返し",
      "おっしゃる通りですね。必要性を感じていらっしゃらないのであれば、無理にお時間を取らせるつもりはございません。\n\nただ、他社様でも最初は同じようにおっしゃっていた企業様が、実際に導入後「もっと早く知りたかった」と言っていただけるケースが多いんです。\n\n3分だけ、なぜそう言っていただけたのか、その理由だけでもお話しさせていただけませんか？",
      "「必要ない」という断りに対して、社会的証明を使って再考を促す",
      "相手の意見を一度肯定してから、社会的証明（他社の成功事例）を使う。「もっと早く知りたかった」で機会損失の恐怖を喚起。",
      "具体的な成功事例を1つ簡潔に紹介し、「御社でも同じような課題はありませんか？」とヒアリングに移行。",
      "component",
      undefined,
      undefined,
      1
    );

    // フォルダ: 興味あり系（状況別）
    const interestedResult = await createFolder(itCategoryId, "興味あり系", "situational", 1, 1);
    if (!interestedResult.success) throw new Error("興味あり系フォルダ作成失敗");
    const interestedFolderId = interestedResult.folderId!;

    // アイテム: デモ提案
    await createItem(
      interestedFolderId,
      "無料デモの提案",
      "ありがとうございます！ご興味を持っていただけて嬉しいです。\n\nそれでは、実際に画面を見ながらご説明させていただける無料デモのお時間をいただけますでしょうか？\n\n30分ほどで、御社の業務に合わせた活用方法をご提案させていただきます。",
      "興味を示してくれた顧客に対して、具体的なネクストアクション（デモ）を提案する",
      "興味を持ってくれた瞬間を逃さず、具体的なネクストアクション（デモ）を提示。「30分」と時間を明示して安心感を与える。",
      "日程調整に移行。「来週の〇曜日または△曜日でご都合はいかがでしょうか？」と複数の選択肢を提示。",
      "component",
      undefined,
      undefined,
      0
    );

    // カテゴリ2: 建設業
    const constructionResult = await createCategory("建設業", "建設・土木企業向け");
    if (!constructionResult.success) throw new Error("建設業カテゴリ作成失敗");
    const constructionCategoryId = constructionResult.categoryId!;

    // フォルダ: 標準台本（基本トーク）
    const mainFlowResult = await createFolder(constructionCategoryId, "標準台本", "base_talk", 0, 1);
    if (!mainFlowResult.success) throw new Error("標準台本フォルダ作成失敗");
    const mainFlowFolderId = mainFlowResult.folderId!;

    // アイテム: 人手不足トーク
    await createItem(
      mainFlowFolderId,
      "人手不足課題の提起",
      "建設業界では、人手不足が深刻化していると伺いますが、御社でも同じような課題をお持ちではないでしょうか？\n\n弊社のシステムを導入いただいた企業様では、現場管理の効率化により、実質的な人員を増やさずに生産性を30%向上させた事例がございます。",
      "建設業界共通の課題（人手不足）について、自社の状況を確認する",
      "業界共通の課題（人手不足）を先に提起することで、「自分事」として捉えてもらう。具体的な数字（30%）で信憑性を高める。",
      "「現在、現場管理はどのように行われていますか？」と現状把握に移行し、課題を深掘り。",
      "component",
      undefined,
      undefined,
      0
    );

    console.log("✅ ワークスペースのシード完了！");

    return {
      success: true,
      message: "2つのカテゴリ、4つのフォルダ（基本トーク×3、状況別×2）、6つのトークアイテムを作成しました",
    };
  } catch (error) {
    console.error("❌ シードエラー:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "不明なエラー",
    };
  }
}
