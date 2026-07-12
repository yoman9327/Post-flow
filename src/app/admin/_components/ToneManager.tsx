"use client";

import { useEffect, useState } from "react";
import type { TonePreset } from "@/lib/types";

export default function ToneManager() {
  const [tones, setTones] = useState<TonePreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [exampleText, setExampleText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        {tones.map((t) => (
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
          </div>
        ))}
      </div>
    </div>
  );
}
