"use client";

/**
 * Hybrid AI Scouter から遷移した際に表示する戦略バナー
 * URL パラメータ company, url, strategy を表示
 */
export default function StrategyBanner({
  company,
  url,
  strategy,
}: {
  company?: string;
  url?: string;
  strategy: string;
}) {
  const target = company || url || "ターゲット";
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(target)}`;

  return (
    <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-800 mb-1">
            🎯 スカウト戦略: {target}
          </p>
          {strategy && (
            <p className="text-sm text-amber-700 whitespace-pre-wrap">{strategy}</p>
          )}
        </div>
        <a
          href={searchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-sm font-medium transition-colors"
        >
          マップを表示
        </a>
      </div>
    </div>
  );
}
