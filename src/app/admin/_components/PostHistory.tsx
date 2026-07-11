"use client";

import { useEffect, useState } from "react";
import type { Post } from "@/lib/types";

const STATUS_STYLE: Record<Post["status"], string> = {
  pending: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  generating: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  generated: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  publishing: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  published: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

const STATUS_LABEL: Record<Post["status"], string> = {
  pending: "等待中",
  generating: "生成中",
  generated: "已生成",
  publishing: "發佈中",
  published: "已發佈",
  failed: "失敗",
};

export default function PostHistory() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/posts");
    const data = await res.json();
    setPosts(data.posts || []);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/posts");
      const data = await res.json();
      if (!cancelled) {
        setPosts(data.posts || []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function retry(id: string) {
    setRetryingId(id);
    await fetch(`/api/posts/${id}/retry`, { method: "POST" });
    await load();
    setRetryingId(null);
  }

  if (loading) return <p className="text-sm text-neutral-500">載入中...</p>;
  if (posts.length === 0) return <p className="text-sm text-neutral-500">尚無貼文紀錄</p>;

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={load}
        className="self-start rounded-lg border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
      >
        重新整理
      </button>
      <div className="flex flex-col gap-3">
        {posts.map((post) => (
          <div
            key={post.id}
            className="flex gap-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.image_url}
              alt=""
              className="h-24 w-24 flex-shrink-0 rounded-lg object-cover"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[post.status]}`}
                >
                  {STATUS_LABEL[post.status]}
                </span>
                <span className="text-xs text-neutral-400">
                  {new Date(post.created_at).toLocaleString("zh-TW")}
                </span>
              </div>
              {post.caption && (
                <p className="truncate text-sm text-neutral-700 dark:text-neutral-300">
                  {post.caption}
                </p>
              )}
              {post.error_message && (
                <p className="text-xs text-red-500">{post.error_message}</p>
              )}
              {post.fb_post_id && (
                <p className="text-xs text-neutral-400">FB Post ID: {post.fb_post_id}</p>
              )}
              {post.status === "failed" && post.caption && (
                <button
                  onClick={() => retry(post.id)}
                  disabled={retryingId === post.id}
                  className="mt-1 self-start rounded-lg border border-neutral-300 px-3 py-1 text-xs font-medium disabled:opacity-50 dark:border-neutral-700"
                >
                  {retryingId === post.id ? "重試中..." : "重新發佈"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
