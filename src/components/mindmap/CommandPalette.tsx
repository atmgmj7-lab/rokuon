"use client";
import { useEffect, useRef, useState } from "react";

export interface Command {
  id:      string;
  label:   string;
  icon:    string;
  group:   string;
  shortcut?: string;
  action:  () => void;
}

interface Props {
  commands: Command[];
  onClose: () => void;
}

export default function CommandPalette({ commands, onClose }: Props) {
  const [query, setQuery]   = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const filtered = query
    ? commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()))
    : commands;

  useEffect(() => { setCursor(0); }, [query]);

  const execute = (cmd: Command) => {
    cmd.action();
    onClose();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor((v) => Math.min(v + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setCursor((v) => Math.max(v - 1, 0)); }
    if (e.key === "Enter" && filtered[cursor]) execute(filtered[cursor]);
    if (e.key === "Escape") onClose();
  };

  // グループ別に分類
  const groups: Record<string, Command[]> = {};
  filtered.forEach((c) => {
    if (!groups[c.group]) groups[c.group] = [];
    groups[c.group].push(c);
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-[480px] bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
        {/* 検索バー */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-stone-100">
          <span className="text-stone-400 text-sm">⌘</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="コマンドを検索..."
            className="flex-1 text-sm outline-none text-stone-700 placeholder-stone-300"
          />
          <kbd className="text-[10px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">ESC</kbd>
        </div>

        {/* コマンドリスト */}
        <div className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="text-center text-xs text-stone-400 py-8">コマンドが見つかりません</p>
          ) : (
            Object.entries(groups).map(([group, cmds]) => {
              return (
                <div key={group}>
                  <div className="px-4 py-1.5 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                    {group}
                  </div>
                  {cmds.map((cmd) => {
                    const globalIdx = filtered.indexOf(cmd);
                    return (
                      <button
                        key={cmd.id}
                        onMouseEnter={() => setCursor(globalIdx)}
                        onClick={() => execute(cmd)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          cursor === globalIdx ? "bg-blue-50" : "hover:bg-stone-50"
                        }`}
                      >
                        <span className="text-base w-6 text-center">{cmd.icon}</span>
                        <span className="flex-1 text-sm text-stone-700">{cmd.label}</span>
                        {cmd.shortcut && (
                          <kbd className="text-[10px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded font-mono">
                            {cmd.shortcut}
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
