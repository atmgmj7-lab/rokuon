"use client";

interface NextMoveHintProps {
  hint: string;
  onAccept: () => void;
  onDismiss: () => void;
}

export default function NextMoveHint({
  hint,
  onAccept,
  onDismiss,
}: NextMoveHintProps) {
  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 max-w-2xl w-full mx-4">
      <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-xl shadow-2xl p-6 border-4 border-yellow-500 animate-pulse">
        <div className="flex items-start gap-4">
          <div className="text-4xl">🎯</div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              勝ちパターンへの最短ルート
            </h3>
            <p className="text-gray-800 mb-4 whitespace-pre-wrap">
              {hint}
            </p>
            <div className="flex gap-3">
              <button
                onClick={onAccept}
                className="flex-1 px-4 py-2 bg-white hover:bg-gray-100 text-gray-900 rounded-lg font-bold transition-colors shadow-md"
              >
                ✅ このルートで進める
              </button>
              <button
                onClick={onDismiss}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-medium transition-colors"
              >
                ✖️ 閉じる
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
