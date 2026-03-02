"use client";

import { useState, useEffect } from "react";
import { addUser, getUsers, type UserListItem } from "@/src/actions/user-actions";

export default function UserManager() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"admin" | "viewer">("viewer");
  const [submitStatus, setSubmitStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    const list = await getUsers();
    setUsers(list);
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitStatus("submitting");
    setErrorMessage("");

    const result = await addUser(email, password, role, name || undefined);

    if (result.success) {
      setSubmitStatus("success");
      setEmail("");
      setPassword("");
      setName("");
      setRole("viewer");
      await loadUsers();
      setTimeout(() => setSubmitStatus("idle"), 3000);
    } else {
      setSubmitStatus("error");
      setErrorMessage(result.error || "登録に失敗しました");
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-[#2D2B2A] mb-4">ユーザー管理</h2>
        <p className="text-sm text-[#827F7B] mb-6">
          新規アカウントを発行し、権限（管理者 / 閲覧者）を設定できます。
        </p>

        {/* 追加フォーム */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-6 mb-8">
          <h3 className="text-lg font-bold text-[#2D2B2A] mb-4">新規ユーザー追加</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-sm font-bold text-[#2D2B2A] mb-2">メールアドレス（必須）</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
                className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-300 focus:border-stone-300 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#2D2B2A] mb-2">パスワード（6文字以上）</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-300 focus:border-stone-300 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#2D2B2A] mb-2">表示名（任意）</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="山田 太郎"
                className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-300 focus:border-stone-300 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#2D2B2A] mb-2">権限</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "admin" | "viewer")}
                className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-300 focus:border-stone-300 transition-all"
              >
                <option value="viewer">閲覧者</option>
                <option value="admin">管理者</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <button
              type="submit"
              disabled={submitStatus === "submitting"}
              className="px-4 py-2 bg-[#4A463F] text-white rounded-lg font-medium hover:bg-[#3E3A34] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitStatus === "submitting" ? "追加中..." : "ユーザーを追加"}
            </button>
            {submitStatus === "success" && (
              <span className="text-sm font-medium text-emerald-600">✓ 追加しました</span>
            )}
            {submitStatus === "error" && (
              <span className="text-sm font-medium text-red-600">{errorMessage}</span>
            )}
          </div>
        </form>

        {/* ユーザー一覧 */}
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-6">
          <h3 className="text-lg font-bold text-[#2D2B2A] mb-4">登録ユーザー一覧</h3>
          {loading ? (
            <p className="text-sm text-[#827F7B]">読み込み中...</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-[#827F7B]">まだユーザーが登録されていません</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200">
                    <th className="text-left py-3 px-4 font-bold text-[#2D2B2A]">メールアドレス</th>
                    <th className="text-left py-3 px-4 font-bold text-[#2D2B2A]">表示名</th>
                    <th className="text-left py-3 px-4 font-bold text-[#2D2B2A]">権限</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-stone-100 hover:bg-stone-50/50">
                      <td className="py-3 px-4 text-[#2D2B2A]">{user.email}</td>
                      <td className="py-3 px-4 text-[#827F7B]">{user.name || "—"}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            user.role === "admin"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-stone-100 text-stone-600"
                          }`}
                        >
                          {user.role === "admin" ? "管理者" : "閲覧者"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
