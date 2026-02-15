"use client";

import { useState, useEffect } from "react";
import type { SituationTag } from "@/src/types/call";

interface SituationPanelProps {
  tags: SituationTag[];
  selectedTagIds: string[];
  onTagToggle: (tagId: string) => void;
}

export default function SituationPanel({
  tags,
  selectedTagIds,
  onTagToggle,
}: SituationPanelProps) {
  // カテゴリ別にグループ化
  const tagsByCategory: { [key: string]: SituationTag[] } = {};
  tags.forEach((tag) => {
    if (!tagsByCategory[tag.category]) {
      tagsByCategory[tag.category] = [];
    }
    tagsByCategory[tag.category].push(tag);
  });

  const categories = Object.keys(tagsByCategory);

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200 p-6 shadow-lg">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">👀</span>
          <h2 className="text-xl font-bold text-gray-800">
            現在の状況は？（通話中にポチポチ選択）
          </h2>
          {selectedTagIds.length > 0 && (
            <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-medium">
              {selectedTagIds.length}個選択中
            </span>
          )}
        </div>

        {categories.length === 0 && (
          <p className="text-gray-500 text-center py-4">
            状況タグがまだ作成されていません
          </p>
        )}

        <div className="space-y-4">
          {categories.map((category) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-gray-600 mb-2 uppercase">
                {category}
              </h3>
              <div className="flex flex-wrap gap-2">
                {tagsByCategory[category].map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => onTagToggle(tag.id)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all transform hover:scale-105 ${
                        isSelected
                          ? "bg-blue-600 text-white shadow-lg ring-2 ring-blue-300"
                          : "bg-white text-gray-700 hover:bg-blue-100 border border-gray-300"
                      }`}
                      title={tag.description}
                    >
                      {isSelected && "✓ "}
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {selectedTagIds.length > 0 && (
          <div className="mt-4 pt-4 border-t border-blue-200">
            <p className="text-sm text-gray-600">
              💡 <strong>選択された状況:</strong>{" "}
              {tags
                .filter((t) => selectedTagIds.includes(t.id))
                .map((t) => t.name)
                .join(", ")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
