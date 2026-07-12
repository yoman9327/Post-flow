"use client";

import { useEffect, useState } from "react";
import type { Post, TonePreset } from "@/lib/types";
import { supabaseBrowser } from "@/lib/supabase/client";

const STATUS_LABEL: Record<Post["status"], string> = {
  pending: "等待中",
  generating: "AI 生成文案中...",
  generated: "文案已生成",
  publishing: "發佈到粉專中...",
  published: "已發佈到粉專",
  failed: "失敗",
};

const MAX_IMAGES = 10;
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

export default function UploadPage() {
  const [tones, setTones] = useState<TonePreset[]>([]);
  const [toneId, setToneId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Post | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/tone-presets");
      const data = await res.json();
      if (!cancelled) {
        const list: TonePreset[] = data.tonePresets || [];
        setTones(list);
        const def = list.find((t) => t.is_default) || list[0];
        if (def) setToneId(def.id);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files || []);
    const capped = picked.slice(0, MAX_IMAGES);
    const tooLarge = capped.find((f) => f.size > MAX_FILE_BYTES);

    setFiles(tooLarge ? [] : capped);
    setPreviews(tooLarge ? [] : capped.map((f) => URL.createObjectURL(f)));
    setResult(null);
    setError(
      tooLarge
        ? `「${tooLarge.name}」超過 10MB，請換一張較小的圖片`
        : picked.length > MAX_IMAGES
          ? `一次最多上傳 ${MAX_IMAGES} 張圖片`
          : null
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0 || !toneId) return;
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      // 1. Ask the server for one signed upload URL per file.
      const presignRes = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mimeTypes: files.map((f) => f.type) }),
      });
      const presignData = await presignRes.json();
      if (!presignRes.ok) {
        setError(presignData.error || "準備上傳失敗");
        return;
      }
      const uploads: { path: string; signedUrl: string; token: string }[] = presignData.uploads;

      // 2. Upload each file straight to Supabase Storage (bypasses our own
      // server, since Vercel serverless functions cap request bodies at 4.5MB).
      const supabase = supabaseBrowser();
      for (let i = 0; i < files.length; i++) {
        const { error: uploadError } = await supabase.storage
          .from("post-images")
          .uploadToSignedUrl(uploads[i].path, uploads[i].token, files[i], {
            contentType: files[i].type,
          });
        if (uploadError) {
          setError(`圖片上傳失敗：${uploadError.message}`);
          return;
        }
      }

      // 3. Tell our server which images to use — this request is tiny (just
      // paths + text), so it stays well under the body size limit.
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: uploads.map((u, i) => ({ path: u.path, mimeType: files[i].type })),
          tonePresetId: toneId,
          uploaderLabel: note.trim() || undefined,
        }),
      });
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
    setFiles([]);
    setPreviews([]);
    setNote("");
    setResult(null);
    setError(null);
  }

  return (
    <main className="mx-auto min-h-screen max-w-lg px-6 py-10">
      <h1 className="mb-1 text-2xl font-semibold">上傳圖片，自動生成貼文</h1>
      <p className="mb-8 text-sm text-neutral-500">
        選擇口吻並上傳商品照片（可一次選多張合成一篇貼文），AI 會自動生成廣告文案並發佈到粉絲專頁。
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
            <label className="mb-1 block text-sm font-medium">
              商品照片（可多選，最多 {MAX_IMAGES} 張，會合成一篇貼文）
            </label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleFileChange}
              required
              multiple
              className="w-full text-sm"
            />
            {previews.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {previews.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={src}
                    alt={`預覽 ${i + 1}`}
                    className="aspect-square w-full rounded-lg object-cover"
                  />
                ))}
              </div>
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
            disabled={submitting || files.length === 0 || !toneId}
            className="rounded-lg bg-neutral-900 px-4 py-2 font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900"
          >
            {submitting ? "處理中，請稍候..." : "上傳並自動發文"}
          </button>
        </form>
      )}

      {result && (
        <div className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-5 dark:border-neutral-800">
          <div className="grid grid-cols-3 gap-2">
            {result.image_urls.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={url}
                alt={`已上傳圖片 ${i + 1}`}
                className="aspect-square w-full rounded-lg object-cover"
              />
            ))}
          </div>
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
            再上傳一次
          </button>
        </div>
      )}
    </main>
  );
}
