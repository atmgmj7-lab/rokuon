"use client";

import { useState, useEffect } from "react";
import { getAllSituationTags, getSuggestedTalks } from "@/src/actions/call-actions";
import { getWorkspaceHierarchy, getItemsByFolder } from "@/src/actions/workspace-actions";
import { seedCallData } from "@/src/actions/seed-call";
import SituationPanel from "@/src/components/call/SituationPanel";
import LiveCoaching from "@/src/components/call/LiveCoaching";
import type { SituationTag, EnrichedScriptItem } from "@/src/types/call";
import type { ScriptItem, ScriptFolder } from "@/src/types/workspace";
import Link from "next/link";

export default function CallPage() {
  const [situationTags, setSituationTags] = useState<SituationTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [baseTalk, setBaseTalk] = useState<ScriptItem[]>([]);
  const [suggestedTalks, setSuggestedTalks] = useState<EnrichedScriptItem[]>([]);
  const [situationalFolders, setSituationalFolders] = useState<any[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [overlayItem, setOverlayItem] = useState<ScriptItem | EnrichedScriptItem | null>(null);
  const [loading, setLoading] = useState(true);

  // データを読み込む
  const loadData = async () => {
    setLoading(true);

    // 状況タグを取得
    const tags = await getAllSituationTags();
    setSituationTags(tags);

    // ワークスペースから基本トークと状況別フォルダを取得
    const hierarchyResult = await getWorkspaceHierarchy();
    if (hierarchyResult.success && hierarchyResult.hierarchy.length > 0) {
      const firstCategory = hierarchyResult.hierarchy[0];

      // base_talkフォルダの最初のものを基本トークとして使用
      const baseTalkFolder = firstCategory.folders.find(
        (f: any) => f.folder.folder_type === "base_talk"
      );
      if (baseTalkFolder) {
        setBaseTalk(baseTalkFolder.items);
      }

      // situationalフォルダで表示可能なものを取得
      const situational = firstCategory.folders.filter(
        (f: any) => f.folder.folder_type === "situational" && f.folder.is_visible_in_sidebar === 1
      );
      setSituationalFolders(situational);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // 状況タグが変更されたら、提案トークを取得
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (selectedTagIds.length > 0) {
        const result = await getSuggestedTalks(selectedTagIds);
        if (result.success) {
          setSuggestedTalks(result.talks);
        }
      } else {
        setSuggestedTalks([]);
      }
    };

    fetchSuggestions();
  }, [selectedTagIds]);

  // タグをトグル
  const handleTagToggle = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  // フォルダの展開/折りたたみ
  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  // サンプルデータをシード
  const handleSeedData = async () => {
    if (!confirm("状況タグのサンプルデータを作成しますか？")) return;

    const result = await seedCallData();
    if (result.success) {
      alert(`✅ ${result.message}`);
      await loadData();
    } else {
      alert(`❌ エラー: ${result.error}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-800">
            📞 ライブ・コーチング（実戦コックピット）
          </h1>
        </div>

        <div className="flex gap-2">
          {situationTags.length === 0 && (
            <button
              onClick={handleSeedData}
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              🌱 状況タグを作成
            </button>
          )}
          <Link
            href="/workspace"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            📁 ワークスペース
          </Link>
          <Link
            href="/"
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium transition-colors"
          >
            ← ホーム
          </Link>
        </div>
      </div>

      {/* 状況インプット・パネル */}
      <SituationPanel
        tags={situationTags}
        selectedTagIds={selectedTagIds}
        onTagToggle={handleTagToggle}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* 中央: ライブ・コーチング・タイムライン */}
        <LiveCoaching
          baseTalk={baseTalk}
          suggestedTalks={suggestedTalks}
          onItemClick={(item) => setOverlayItem(item)}
        />

        {/* 右: クイック・レスポンス（武器庫） */}
        <div className="w-96 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4">
            <h2 className="text-lg font-bold">🛡️ クイック・レスポンス</h2>
            <p className="text-sm opacity-90 mt-1">想定外の質問に即対応</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {situationalFolders.length === 0 && (
              <div className="text-center py-12 text-gray-500 text-sm">
                <p className="mb-4">武器庫がありません</p>
                <Link
                  href="/workspace"
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors inline-block"
                >
                  ワークスペースで作成
                </Link>
              </div>
            )}

            {situationalFolders.map((folderData: any) => (
              <div key={folderData.folder.id} className="mb-3">
                <button
                  onClick={() => toggleFolder(folderData.folder.id)}
                  className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-left flex items-center justify-between transition-colors"
                >
                  <span>{folderData.folder.name}</span>
                  <span className="text-sm">
                    {expandedFolders.has(folderData.folder.id) ? "▼" : "▶"}
                  </span>
                </button>

                {expandedFolders.has(folderData.folder.id) && (
                  <div className="mt-2 space-y-2 ml-2">
                    {folderData.items.map((item: ScriptItem) => (
                      <button
                        key={item.id}
                        onClick={() => setOverlayItem(item)}
                        className="w-full px-3 py-2 bg-white hover:bg-orange-50 border border-gray-200 hover:border-orange-300 rounded-lg text-left text-sm transition-all"
                      >
                        <div className="font-medium text-gray-800">{item.title}</div>
                        <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {item.content.substring(0, 60)}...
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* オーバーレイ（トーク詳細表示） */}
      {overlayItem && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setOverlayItem(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">{overlayItem.title}</h2>
              <button
                onClick={() => setOverlayItem(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium transition-colors"
              >
                ✖️ 閉じる
              </button>
            </div>

            <div className="prose max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap text-lg leading-relaxed">
                {overlayItem.content}
              </p>
            </div>

            {overlayItem.strategy_note && (
              <div className="mt-6 p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                <h3 className="font-bold text-purple-800 mb-2">💡 戦略メモ</h3>
                <p className="text-purple-700 whitespace-pre-wrap">
                  {overlayItem.strategy_note}
                </p>
              </div>
            )}

            {overlayItem.next_move_hint && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg border-2 border-green-200">
                <h3 className="font-bold text-green-800 mb-2">➡️ 次の一手</h3>
                <p className="text-green-700 whitespace-pre-wrap">
                  {overlayItem.next_move_hint}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
