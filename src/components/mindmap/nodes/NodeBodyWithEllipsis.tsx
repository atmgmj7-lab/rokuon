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
      setShowEllipsis(content.scrollHeight > wrapper.clientHeight);
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
          className="absolute bottom-0 right-0 inline-block px-1 text-stone-500 text-[10px] font-medium pointer-events-none"
          style={{ lineHeight: 1.2 }}
        >
          …
        </span>
      )}
    </div>
  );
}
