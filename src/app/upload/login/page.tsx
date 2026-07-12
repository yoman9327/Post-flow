"use client";

import { useState } from "react";

export default function UploadLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "upload", password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "登入失敗");
      setLoading(false);
      return;
    }
    // Hard navigation so the proxy re-evaluates the freshly-set session
    // cookie on a real request, instead of relying on client-side routing.
    window.location.href = "/upload";
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="mb-1 text-2xl font-semibold">上傳圖片</h1>
      <p className="mb-6 text-sm text-neutral-500">
        請輸入邀請密碼以上傳圖片並自動產生貼文
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="password"
          placeholder="邀請密碼"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoFocus
          className="rounded-lg border border-neutral-300 px-4 py-2 outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-neutral-900 px-4 py-2 font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        >
          {loading ? "登入中..." : "進入"}
        </button>
      </form>
    </main>
  );
}
