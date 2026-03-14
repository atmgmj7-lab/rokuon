"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Underline } from "lucide-react";

const FONT_SIZES = [10, 12, 14, 16, 18];
const FONT_COLORS = ["#1C1917", "#374151", "#78716C", "#C2410C", "#2563EB", "#16A34A", "#9333EA"];
const MARKER_COLORS = ["#FEF08A", "#BBF7D0", "#BFDBFE", "#FBCFE8", "#FED7AA", "transparent"];

interface Props {
  value: string;
  onChange: (html: string) => void;
  onBlur?: (html?: string) => void;
  placeholder?: string;
  defaultFontSize?: number;
  defaultFontColor?: string;
  minHeight?: number;
  className?: string;
}

/** プレーンテキストをHTMLに変換（改行をbrに） */
function toHtml(plain: string): string {
  if (!plain) return "";
  if (plain.includes("<") && plain.includes(">")) return plain; // 既にHTML
  return plain.split("\n").map((line) => line || "<br>").join("<br>");
}

export default function NodeRichTextEditor({
  value,
  onChange,
  onBlur,
  placeholder = "ダブルクリックで入力…",
  defaultFontSize = 12,
  defaultFontColor = "#374151",
  minHeight = 48,
  className = "",
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showToolbar, setShowToolbar] = useState(false);

  // 初期値・外部からの変更時のみ innerHTML を更新（フォーカス中は更新しない）
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (el.contains(document.activeElement)) return; // 編集中は更新しない
    const html = toHtml(value);
    if (el.innerHTML !== html) {
      el.innerHTML = html || "";
    }
  }, [value]);

  // マウント時にフォーカス
  useEffect(() => {
    editorRef.current?.focus();
  }, []);

  const applyFormat = useCallback((cmd: string, val?: string) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    document.execCommand("styleWithCSS", false, "true");
    switch (cmd) {
      case "fontSize":
        document.execCommand("fontSize", false, "3"); // 3 = 16px相当、後でspanで上書き
        const fontElements = el.querySelectorAll("font[size]");
        fontElements.forEach((f) => {
          const span = document.createElement("span");
          span.style.fontSize = `${val ?? 12}px`;
          span.innerHTML = f.innerHTML;
          f.parentNode?.replaceChild(span, f);
        });
        break;
      case "foreColor":
        document.execCommand("foreColor", false, val ?? defaultFontColor);
        break;
      case "underline":
        document.execCommand("underline", false);
        break;
      case "hiliteColor":
        document.execCommand("hiliteColor", false, val ?? "#FEF08A");
        break;
      case "removeFormat":
        document.execCommand("removeFormat", false);
        break;
      default:
        break;
    }
    onChange(el.innerHTML);
  }, [defaultFontColor, onChange]);

  const handleInput = useCallback(() => {
    const el = editorRef.current;
    if (el) onChange(el.innerHTML);
  }, [onChange]);

  const handleSelect = useCallback(() => {
    const sel = window.getSelection();
    setShowToolbar(!!sel && sel.toString().length > 0);
  }, []);

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {showToolbar && (
        <div
          className="nodrag flex items-center gap-1 py-1 px-2 rounded-lg bg-stone-100 border border-stone-200 flex-wrap"
          onMouseDown={(e) => e.preventDefault()}
        >
          <select
            className="nodrag text-[10px] border border-stone-200 rounded px-1.5 py-0.5 bg-white"
            onChange={(e) => applyFormat("fontSize", e.target.value)}
            value={defaultFontSize}
          >
            {FONT_SIZES.map((s) => (
              <option key={s} value={s}>{s}px</option>
            ))}
          </select>
          <div className="flex gap-0.5">
            {FONT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className="nodrag w-4 h-4 rounded border border-stone-200 hover:scale-110"
                style={{ backgroundColor: c }}
                onClick={() => applyFormat("foreColor", c)}
                title="文字色"
              />
            ))}
          </div>
          <button
            type="button"
            className="nodrag p-0.5 rounded hover:bg-stone-200"
            onClick={() => applyFormat("underline")}
            title="下線"
          >
            <Underline className="w-3.5 h-3.5 text-stone-600" />
          </button>
          <div className="flex gap-0.5 items-center">
            {MARKER_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`nodrag w-4 h-4 rounded border ${c === "transparent" ? "border-dashed" : "border-stone-200"} hover:scale-110`}
                style={{ backgroundColor: c === "transparent" ? "white" : c }}
                onClick={() => applyFormat("hiliteColor", c === "transparent" ? "" : c)}
                title={c === "transparent" ? "マーカー解除" : "マーカー"}
              />
            ))}
          </div>
        </div>
      )}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="nodrag w-full outline-none leading-relaxed whitespace-pre-wrap"
        style={{
          minHeight,
          fontSize: defaultFontSize,
          color: defaultFontColor,
          fontFamily: "inherit",
        }}
        data-placeholder={placeholder}
        onInput={handleInput}
        onBlur={() => {
          setShowToolbar(false);
          const html = editorRef.current?.innerHTML ?? "";
          onBlur?.(html);
        }}
        onSelect={handleSelect}
        onMouseUp={handleSelect}
        onKeyUp={handleSelect}
      />
      <style>{`
        [contenteditable][data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: #9CA3AF;
          font-style: italic;
          font-size: 11px;
        }
      `}</style>
    </div>
  );
}
