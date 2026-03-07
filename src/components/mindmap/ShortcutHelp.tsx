"use client";
import { useState } from "react";

const SHORTCUTS = [
  { key: "⌘K / Ctrl+K",        desc: "コマンドパレットを開く" },
  { key: "⌘Z / Ctrl+Z",        desc: "元に戻す (Undo)" },
  { key: "⌘⇧Z / Ctrl+Shift+Z", desc: "やり直す (Redo)" },
  { key: "Delete / Backspace",  desc: "選択ノード/エッジを削除" },
  { key: "Space + ドラッグ",    desc: "キャンバスをパン" },
  { key: "ホイール",            desc: "ズームイン/アウト" },
  { key: "ノード端点ドラッグ",  desc: "エッジを接続" },
  { key: "ダブルクリック",      desc: "テキストノードを編集" },
];

export default function ShortcutHelp() {
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute bottom-4 right-4 z-20">
      {open && (
        <div className="mb-2 w-72 bg-white border border-stone-200 rounded-2xl shadow-lg overflow-hidden">
          <div className="px-4 py-3 bg-stone-50 border-b border-stone-100 flex items-center justify-between">
            <span className="text-xs font-bold text-stone-600">⌨️ キーボードショートカット</span>
            <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-stone-600 text-sm">✕</button>
          </div>
          <div className="divide-y divide-stone-100">
            {SHORTCUTS.map(({ key, desc }) => (
              <div key={key} className="flex items-center justify-between px-4 py-2">
                <span className="text-[10px] font-mono bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">{key}</span>
                <span className="text-[11px] text-stone-500 ml-3 text-right">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-9 h-9 rounded-full shadow-md text-sm font-bold transition-colors ${
          open ? "bg-stone-700 text-white" : "bg-white border border-stone-200 text-stone-500 hover:bg-stone-50"
        }`}
        title="ショートカット一覧"
      >
        ?
      </button>
    </div>
  );
}
