"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onDoubleClick?: () => void;
}

/** コンテンツがオーバーフローした場合に「...」を表示するラッパー */
export default function NodeBodyWithEllipsis({ children, className = "", style = {}, onDoubleClick }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [showEllipsis, setShowEllipsis] = useState(false);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const content = contentRef.current;
    if (!wrapper || !content) return;

    const check = () => {
      requestAnimationFrame(() => {
        const w = wrapperRef.current;
        const c = contentRef.current;
        if (!w || !c) return;
        // レイアウト未確定時はスキップ
        if (w.clientHeight < 10) return;
        // 明確にオーバーフローしている場合のみ表示（2px 余裕で丸め誤差を吸収）
        const overflowed = c.scrollHeight > w.clientHeight + 2;
        setShowEllipsis(overflowed);
      });
    };

    check();
    const ro = new ResizeObserver(check);
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, [children]);

  return (
    <div
      ref={wrapperRef}
      className={className}
      onDoubleClick={onDoubleClick}
      style={{
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
        position: "relative",
        ...style,
      }}
    >
      <div ref={contentRef}>
        {children}
      </div>
      {showEllipsis && (
        <span
          className="absolute bottom-0 right-0 inline-block px-1.5 py-0.5 text-stone-600 text-[11px] font-bold pointer-events-none"
          style={{ lineHeight: 1.2 }}
        >
          …
        </span>
      )}
    </div>
  );
}
