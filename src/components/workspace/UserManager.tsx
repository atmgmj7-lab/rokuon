"use client";

import { useState, useEffect } from "react";
import { addUser, getUsers, updateUser, type UserListItem } from "@/src/actions/user-actions";

export default function UserManager() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"admin" | "viewer">("viewer");
  const [submitStatus, setSubmitStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // 編集モーダル用
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<"admin" | "viewer">("viewer");
  const [editStatus, setEditStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [editErrorMessage, setEditErrorMessage] = useState("");

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

  const openEditModal = (user: UserListItem) => {
    setEditingUser(user);
    setEditEmail(user.email);
    setEditPassword("");
    setEditName(user.name || "");
    setEditRole((user.role as "admin" | "viewer") || "viewer");
    setEditStatus("idle");
    setEditErrorMessage("");
  };

  const closeEditModal = () => {
    setEditingUser(null);
    setEditEmail("");
    setEditPassword("");
    setEditName("");
    setEditRole("viewer");
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditStatus("submitting");
    setEditErrorMessage("");

    const result = await updateUser({
      userId: editingUser.id,
      email: editEmail,
      password: editPassword || undefined,
      name: editName || undefined,
      role: editRole,
    });

    if (result.success) {
      setEditStatus("success");
      await loadUsers();
      setTimeout(() => {
        closeEditModal();
      }, 1500);
    } else {
      setEditStatus("error");
      setEditErrorMessage(result.error || "更新に失敗しました");
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-[#2D2B2A] mb-4">ユーザー管理</h2>
        <p className="text-sm text-[#827F7B] mb-6">
          新規アカウントを発行し、権限（管理者 / 閲覧者）を設定できます。既存ユーザーのメールアドレス・パスワード・表示名・権限は編集ボタンから変更できます。
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
                    <th className="text-right py-3 px-4 font-bold text-[#2D2B2A]">操作</th>
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
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => openEditModal(user)}
                          className="text-sm font-medium text-[#4A463F] hover:text-[#2D2B2A] underline"
                        >
                          編集
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 編集モーダル */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={closeEditModal}>
          <div
            className="bg-white rounded-2xl border border-stone-200/80 shadow-xl p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-[#2D2B2A] mb-4">ユーザーを編集</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#2D2B2A] mb-2">メールアドレス（必須）</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                  className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-300 focus:border-stone-300 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#2D2B2A] mb-2">パスワード（変更する場合のみ入力）</label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="空欄のままなら変更しません"
                  minLength={6}
                  className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-300 focus:border-stone-300 transition-all"
                />
                <p className="text-xs text-[#827F7B] mt-1">6文字以上で入力</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-[#2D2B2A] mb-2">表示名（任意）</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="山田 太郎"
                  className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-300 focus:border-stone-300 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#2D2B2A] mb-2">権限</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as "admin" | "viewer")}
                  className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-300 focus:border-stone-300 transition-all"
                >
                  <option value="viewer">閲覧者</option>
                  <option value="admin">管理者</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2 text-[#4A463F] border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={editStatus === "submitting"}
                  className="px-4 py-2 bg-[#4A463F] text-white rounded-lg font-medium hover:bg-[#3E3A34] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editStatus === "submitting" ? "更新中..." : editStatus === "success" ? "✓ 更新しました" : "更新"}
                </button>
              </div>
              {editStatus === "error" && (
                <p className="text-sm font-medium text-red-600">{editErrorMessage}</p>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
