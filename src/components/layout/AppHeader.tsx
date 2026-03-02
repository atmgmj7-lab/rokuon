"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, logoutUser } from "@/src/actions/auth-actions";

export default function AppHeader() {
  const pathname = usePathname();
  const [user, setUser] = useState<{ id: string; email: string; role: "admin" | "viewer" } | null>(null);

  useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);

  // ログイン画面ではヘッダーを非表示
  if (pathname === "/login") {
    return null;
  }

  return (
    <header className="bg-[#FDFCFB] border-b border-stone-200/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-[#2D2B2A] hover:text-[#4A463F] transition-colors">
          Recode
        </Link>
        <div className="flex items-center gap-4">
          {user && (
            <>
              <span className="text-sm text-[#827F7B]">
                {user.email}
                <span className="ml-2 text-stone-400">({user.role})</span>
              </span>
              <form action={logoutUser}>
                <button
                  type="submit"
                  className="px-4 py-2 bg-white border border-stone-200 text-stone-600 rounded-lg text-sm font-medium hover:bg-stone-50 hover:text-stone-900 transition-colors"
                >
                  ログアウト
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
