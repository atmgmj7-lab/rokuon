"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginUser } from "@/src/actions/auth-actions";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await loginUser(email, password);

    if (result.success) {
      router.push("/workspace");
      router.refresh();
    } else {
      setError(result.error || "ログインに失敗しました");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-8">
          <h1 className="text-2xl font-bold text-[#2D2B2A] mb-2">ログイン</h1>
          <p className="text-sm text-[#827F7B] mb-6">
            ワークスペースにアクセスするにはログインしてください
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-[#2D2B2A] mb-2">
                メールアドレス
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
                autoComplete="email"
                className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-300 focus:border-stone-300 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-[#2D2B2A] mb-2">
                パスワード
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-300 focus:border-stone-300 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-[#4A463F] text-white rounded-lg font-medium hover:bg-[#3E3A34] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "ログイン中..." : "ログイン"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#827F7B]">
            <Link href="/" className="text-[#4A463F] hover:underline">
              ← ホームに戻る
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
