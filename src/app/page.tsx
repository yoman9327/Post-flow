import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-3xl font-semibold">Post Flow</h1>
      <p className="text-neutral-500">
        上傳圖片，AI 自動用指定口吻生成 Facebook 廣告貼文並發佈到粉絲專頁。
      </p>
      <div className="flex gap-4">
        <Link
          href="/upload"
          className="rounded-lg bg-neutral-900 px-5 py-2.5 font-medium text-white dark:bg-white dark:text-neutral-900"
        >
          上傳圖片
        </Link>
        <Link
          href="/admin"
          className="rounded-lg border border-neutral-300 px-5 py-2.5 font-medium dark:border-neutral-700"
        >
          管理後台
        </Link>
      </div>
    </main>
  );
}
