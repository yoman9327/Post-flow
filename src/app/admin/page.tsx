"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PostHistory from "./_components/PostHistory";
import ToneManager from "./_components/ToneManager";
import SettingsPanel from "./_components/SettingsPanel";

const TABS = [
  { key: "posts", label: "貼文紀錄" },
  { key: "tones", label: "口吻範本" },
  { key: "settings", label: "設定" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("posts");

  async function logout() {
    await fetch("/api/auth?kind=admin", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">管理後台</h1>
        <button onClick={logout} className="text-sm text-neutral-500 underline">
          登出
        </button>
      </div>

      <div className="mb-6 flex gap-2 border-b border-neutral-200 dark:border-neutral-800">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={
              "px-3 py-2 text-sm font-medium " +
              (tab === t.key
                ? "border-b-2 border-neutral-900 text-neutral-900 dark:border-white dark:text-white"
                : "text-neutral-400")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "posts" && <PostHistory />}
      {tab === "tones" && <ToneManager />}
      {tab === "settings" && <SettingsPanel />}
    </main>
  );
}
