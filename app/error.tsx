"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-8">
      <h2 className="text-xl font-bold text-gray-800 mb-4">エラーが発生しました</h2>
      <p className="text-gray-600 mb-6 text-center">{error.message}</p>
      <button
        onClick={() => reset()}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
      >
        再試行
      </button>
    </div>
  );
}
