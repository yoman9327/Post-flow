"use client";

import { useEffect, useState } from "react";
import type { Post, TonePreset } from "@/lib/types";

const STATUS_LABEL: Record<Post["status"], string> = {
  pending: "等待中",
  generating: "AI 生成文案中...",
  generated: "文案已生成",
  publishing: "發佈到粉專中...",
  published: "已發佈到粉專",
  failed: "失敗",
};

export default function UploadPage() {
  const [tones, setTones] = useState<TonePreset[]>([]);
  const [toneId, setToneId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Post | null>(null);

  useEffect(() => {
    fetch("/api/tone-presets")
      .then((res) => res.json())
      .then((data) => {
        const list: TonePreset[] = data.tonePresets || [];
        setTones(list);
        const def = list.find((t) => t.is_default) || list[0];
        if (def) setToneId(def.id);
      });
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
    setResult(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !toneId) return;
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("tonePresetId", toneId);
      if (note.trim()) formData.append("uploaderLabel", note.trim());

      const res = await fetch("/api/posts", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "上傳失敗");
        return;
      }
      setResult(data.post);
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setNote("");
    setResult(null);
    setError(null);
  }

  return (
    <main className="mx-auto min-h-screen max-w-lg px-6 py-10">
      <h1 className="mb-1 text-2xl font-semibold">上傳圖片，自動生成貼文</h1>
      <p className="mb-8 text-sm text-neutral-500">
        選擇口吻並上傳商品照片，AI 會自動生成廣告文案並發佈到粉絲專頁。
      </p>

      {!result && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">口吻風格</label>
            <select
              value={toneId}
              onChange={(e) => setToneId(e.target.value)}
              required
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
            >
              {tones.length === 0 && <option value="">尚未設定口吻範本</option>}
              {tones.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">商品照片</label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleFileChange}
              required
              className="w-full text-sm"
            />
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt="預覽"
                className="mt-3 max-h-72 w-full rounded-lg object-contain"
              />
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">補充說明（選填）</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例如：這是新品、正在特價中"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !file || !toneId}
            className="rounded-lg bg-neutral-900 px-4 py-2 font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900"
          >
            {submitting ? "處理中，請稍候..." : "上傳並自動發文"}
          </button>
        </form>
      )}

      {result && (
        <div className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-5 dark:border-neutral-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={result.image_url}
            alt="已上傳圖片"
            className="max-h-72 w-full rounded-lg object-contain"
          />
          <div>
            <span
              className={
                "inline-block rounded-full px-3 py-1 text-xs font-medium " +
                (result.status === "published"
                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                  : result.status === "failed"
                    ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                    : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300")
              }
            >
              {STATUS_LABEL[result.status]}
            </span>
          </div>
          {result.caption && (
            <p className="whitespace-pre-wrap rounded-lg bg-neutral-50 p-4 text-sm dark:bg-neutral-900">
              {result.caption}
            </p>
          )}
          {result.error_message && (
            <p className="text-sm text-red-500">{result.error_message}</p>
          )}
          <button
            onClick={reset}
            className="rounded-lg border border-neutral-300 px-4 py-2 font-medium dark:border-neutral-700"
          >
            再上傳一張
          </button>
        </div>
      )}
    </main>
  );
}
