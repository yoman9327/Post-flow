"use client";

import { useEffect, useState } from "react";
import type { TonePreset } from "@/lib/types";

export default function ToneManager() {
  const [tones, setTones] = useState<TonePreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [exampleText, setExampleText] = useState("");
  const [restrictions, setRestrictions] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editExampleText, setEditExampleText] = useState("");
  const [editRestrictions, setEditRestrictions] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/tone-presets");
    const data = await res.json();
    setTones(data.tonePresets || []);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/tone-presets");
      const data = await res.json();
      if (!cancelled) {
        setTones(data.tonePresets || []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function createTone(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/tone-presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          example_text: exampleText,
          restrictions: restrictions.trim() || undefined,
          is_default: tones.length === 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "新增失敗");
        return;
      }
      setName("");
      setExampleText("");
      setRestrictions("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function setDefault(id: string) {
    await fetch(`/api/tone-presets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_default: true }),
    });
    await load();
  }

  async function remove(id: string) {
    if (!confirm("確定要刪除這個口吻範本嗎？")) return;
    await fetch(`/api/tone-presets/${id}`, { method: "DELETE" });
    await load();
  }

  function startEdit(t: TonePreset) {
    setEditingId(t.id);
    setEditName(t.name);
    setEditExampleText(t.example_text);
    setEditRestrictions(t.restrictions || "");
  }

  async function saveEdit(id: string) {
    setEditSaving(true);
    try {
      await fetch(`/api/tone-presets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          example_text: editExampleText,
          restrictions: editRestrictions,
        }),
      });
      setEditingId(null);
      await load();
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <form
        onSubmit={createTone}
        className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
      >
        <h3 className="font-medium">新增口吻範本</h3>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="口吻名稱，例如：活潑逗趣、專業質感"
          required
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <textarea
          value={exampleText}
          onChange={(e) => setExampleText(e.target.value)}
          placeholder="貼上一段代表這個口吻的範例貼文文字，AI 會模仿這個語氣風格"
          required
          rows={4}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <div>
          <label className="mb-1 block text-xs text-neutral-500">
            限制內容（選填）——AI 絕對不會提到的產品、服務或字詞，例如你們沒有做的服務項目
          </label>
          <textarea
            value={restrictions}
            onChange={(e) => setRestrictions(e.target.value)}
            placeholder="例如：不要提到包膜、鍍膜、隔熱紙，我們只做音響安裝"
            rows={2}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="self-start rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        >
          {saving ? "儲存中..." : "新增"}
        </button>
      </form>

      <div className="flex flex-col gap-3">
        <h3 className="font-medium">現有口吻範本</h3>
        {loading && <p className="text-sm text-neutral-500">載入中...</p>}
        {!loading && tones.length === 0 && (
          <p className="text-sm text-neutral-500">尚未新增任何口吻範本</p>
        )}
        {tones.map((t) =>
          editingId === t.id ? (
            <div
              key={t.id}
              className="flex flex-col gap-2 rounded-lg border border-neutral-300 p-4 dark:border-neutral-600"
            >
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              <textarea
                value={editExampleText}
                onChange={(e) => setEditExampleText(e.target.value)}
                rows={4}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              <div>
                <label className="mb-1 block text-xs text-neutral-500">限制內容（選填）</label>
                <textarea
                  value={editRestrictions}
                  onChange={(e) => setEditRestrictions(e.target.value)}
                  placeholder="例如：不要提到包膜、鍍膜、隔熱紙，我們只做音響安裝"
                  rows={2}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => saveEdit(t.id)}
                  disabled={editSaving}
                  className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
                >
                  {editSaving ? "儲存中..." : "儲存"}
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs dark:border-neutral-700"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <div
              key={t.id}
              className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t.name}</span>
                  {t.is_default && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900 dark:text-green-300">
                      預設
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(t)}
                    className="text-xs text-neutral-500 underline"
                  >
                    編輯
                  </button>
                  {!t.is_default && (
                    <button
                      onClick={() => setDefault(t.id)}
                      className="text-xs text-neutral-500 underline"
                    >
                      設為預設
                    </button>
                  )}
                  <button
                    onClick={() => remove(t.id)}
                    className="text-xs text-red-500 underline"
                  >
                    刪除
                  </button>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm text-neutral-600 dark:text-neutral-400">
                {t.example_text}
              </p>
              {t.restrictions && (
                <p className="whitespace-pre-wrap rounded-lg bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
                  限制內容：{t.restrictions}
                </p>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}
