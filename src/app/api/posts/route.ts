import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { hasSession } from "@/lib/auth";
import { createPostFromUpload } from "@/lib/pipeline";
import { supabaseAdmin } from "@/lib/supabase/admin";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB, Facebook's own limit is similar

export async function POST(req: NextRequest) {
  // Either an authenticated uploader or a logged-in admin may submit a post.
  const isUploader = await hasSession("upload");
  const isAdmin = await hasSession("admin");
  if (!isUploader && !isAdmin) {
    return NextResponse.json({ error: "未授權，請先登入" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "無效的表單資料" }, { status: 400 });
  }

  const file = form.get("image");
  const tonePresetId = form.get("tonePresetId");
  const uploaderLabel = form.get("uploaderLabel");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "請選擇一張圖片" }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "圖片檔案過大，請小於 10MB" }, { status: 400 });
  }
  if (typeof tonePresetId !== "string" || !tonePresetId) {
    return NextResponse.json({ error: "請選擇口吻範本" }, { status: 400 });
  }

  try {
    const post = await createPostFromUpload({
      file,
      tonePresetId,
      uploaderLabel: typeof uploaderLabel === "string" ? uploaderLabel : null,
    });
    return NextResponse.json({ post });
  } catch (err) {
    console.error("upload failed", err);
    const message = err instanceof Error ? err.message : "上傳失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const denied = await requireSession("admin");
  if (denied) return denied;

  const limit = Number(req.nextUrl.searchParams.get("limit") || 50);
  const { data, error } = await supabaseAdmin()
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(Math.min(limit, 200));

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ posts: data });
}
