import { useState } from "react";

const APP_BASE_URL = import.meta.env.VITE_APP_BASE_URL || "http://127.0.0.1:3002";

interface LoginProps {
  onLoginSuccess: (token: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const base = APP_BASE_URL.replace(/\/$/, "");
      const url = `${base}/api/auth/ext-login`;
      console.log("[スカウター] ログイン試行: url=", url);

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
        signal: controller.signal,
      });

      let data: { success?: boolean; token?: string; user?: unknown; error?: string };
      try {
        data = (await res.json()) as typeof data;
      } catch (parseErr) {
        console.error("[スカウター] ログイン応答のJSON解析失敗:", parseErr);
        setError("サーバーからの応答形式が不正です。しばらく待って再試行してください。");
        return;
      }

      if (data.success && data.token) {
        await chrome.storage.local.set({
          scouter_token: data.token,
          scouter_user: data.user,
        });
        onLoginSuccess(data.token);
      } else {
        const msg = data.error || "ログインに失敗しました";
        console.warn("[スカウター] ログイン失敗:", msg);
        setError(msg);
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.name === "AbortError"
            ? "接続がタイムアウトしました（30秒）。ネットワークまたはサーバーを確認してください。"
            : err.message
          : "接続に失敗しました";
      console.error("[スカウター] ログインエラー:", err);
      setError(msg);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-[280px] bg-white rounded-xl shadow-lg border border-stone-200 p-6">
        <h1 className="text-lg font-bold text-stone-800 mb-1">スカウター</h1>
        <p className="text-[10px] text-stone-500 mb-4">ログインしてトークを同期</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-[10px] text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-medium text-stone-600 mb-1">メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
              autoComplete="email"
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-[10px] focus:ring-2 focus:ring-stone-300 focus:border-stone-300 outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-medium text-stone-600 mb-1">パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-[10px] focus:ring-2 focus:ring-stone-300 focus:border-stone-300 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-stone-700 hover:bg-stone-800 text-white rounded-lg text-[10px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "ログイン中..." : "ログイン"}
          </button>
        </form>

        <p className="mt-4 text-[9px] text-stone-400 text-center">
          アプリ: {APP_BASE_URL}
        </p>
      </div>
    </div>
  );
}
