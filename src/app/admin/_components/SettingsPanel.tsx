"use client";

import { useEffect, useState } from "react";

interface SettingsData {
  fb_page_id: string | null;
  fb_page_access_token_set: boolean;
  auto_publish: boolean;
}

export default function SettingsPanel() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [pageId, setPageId] = useState("");
  const [token, setToken] = useState("");
  const [autoPublish, setAutoPublish] = useState(true);
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newUploadPassword, setNewUploadPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/settings");
    const data = await res.json();
    setSettings(data.settings);
    setPageId(data.settings?.fb_page_id || "");
    setAutoPublish(data.settings?.auto_publish ?? true);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (!cancelled) {
        setSettings(data.settings);
        setPageId(data.settings?.fb_page_id || "");
        setAutoPublish(data.settings?.auto_publish ?? true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const body: Record<string, unknown> = {
      fb_page_id: pageId,
      auto_publish: autoPublish,
    };
    if (token.trim()) body.fb_page_access_token = token.trim();
    if (newAdminPassword.trim()) body.new_admin_password = newAdminPassword.trim();
    if (newUploadPassword.trim()) body.new_upload_password = newUploadPassword.trim();

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "儲存失敗");
        return;
      }
      setToken("");
      setNewAdminPassword("");
      setNewUploadPassword("");
      setMessage("設定已儲存");
      await load();
    } finally {
      setSaving(false);
    }
  }

  if (!settings) return <p className="text-sm text-neutral-500">載入中...</p>;

  return (
    <form onSubmit={save} className="flex max-w-md flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h3 className="font-medium">Facebook 粉絲專頁</h3>
        <div>
          <label className="mb-1 block text-sm">Page ID</label>
          <input
            value={pageId}
            onChange={(e) => setPageId(e.target.value)}
            placeholder="例如：123456789012345"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm">
            Page Access Token{" "}
            {settings.fb_page_access_token_set && (
              <span className="text-xs text-green-600 dark:text-green-400">（已設定）</span>
            )}
          </label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={settings.fb_page_access_token_set ? "留空表示不變更" : "貼上長期 Page Access Token"}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={autoPublish}
            onChange={(e) => setAutoPublish(e.target.checked)}
          />
          文案生成後自動發佈到粉專（關閉則僅生成文案，需手動重新發佈）
        </label>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="font-medium">密碼管理</h3>
        <div>
          <label className="mb-1 block text-sm">變更管理員密碼</label>
          <input
            type="password"
            value={newAdminPassword}
            onChange={(e) => setNewAdminPassword(e.target.value)}
            placeholder="留空表示不變更（至少 6 碼）"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm">變更上傳邀請密碼</label>
          <input
            type="password"
            value={newUploadPassword}
            onChange={(e) => setNewUploadPassword(e.target.value)}
            placeholder="留空表示不變更（至少 6 碼）"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
      </section>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {message && <p className="text-sm text-green-600 dark:text-green-400">{message}</p>}

      <button
        type="submit"
        disabled={saving}
        className="self-start rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
      >
        {saving ? "儲存中..." : "儲存設定"}
      </button>
    </form>
  );
}
