"use client";

/** HTMLを簡易サニタイズ（span,u,strong,em,br,font と style のみ許可） */
function sanitizeHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/javascript:/gi, "");
}

interface Props {
  html: string;
  defaultFontSize?: number;
  defaultFontColor?: string;
  className?: string;
}

/** プレーンテキストをHTMLに変換 */
function toHtml(plain: string): string {
  if (!plain) return "";
  if (plain.includes("<") && plain.includes(">")) return plain;
  return plain.split("\n").map((line) => line || "<br>").join("<br>");
}

export default function NodeRichTextView({
  html,
  defaultFontSize = 12,
  defaultFontColor = "#374151",
  className = "",
}: Props) {
  const displayHtml = toHtml(html);
  const sanitized = sanitizeHtml(displayHtml);

  return (
    <div
      className={className}
      style={{ fontSize: defaultFontSize, color: defaultFontColor }}
      dangerouslySetInnerHTML={{ __html: sanitized || "" }}
    />
  );
}
