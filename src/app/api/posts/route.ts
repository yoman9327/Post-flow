import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { hasSession } from "@/lib/auth";
import { createPostFromUpload, MAX_IMAGES_PER_POST } from "@/lib/pipeline";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  // Either an authenticated uploader or a logged-in admin may submit a post.
  const isUploader = await hasSession("upload");
  const isAdmin = await hasSession("admin");
  if (!isUploader && !isAdmin) {
    return NextResponse.json({ error: "未授權，請先登入" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "無效的請求內容" }, { status: 400 });
  }

  const images = body.images;
  const tonePresetId = body.tonePresetId;
  const uploaderLabel = body.uploaderLabel;

  if (!Array.isArray(images) || images.length === 0) {
    return NextResponse.json({ error: "請選擇至少一張圖片" }, { status: 400 });
  }
  if (images.length > MAX_IMAGES_PER_POST) {
    return NextResponse.json(
      { error: `一次最多上傳 ${MAX_IMAGES_PER_POST} 張圖片` },
      { status: 400 }
    );
  }
  const validImages = images.every(
    (img) =>
      img && typeof img.path === "string" && img.path && typeof img.mimeType === "string"
  );
  if (!validImages) {
    return NextResponse.json({ error: "圖片資訊格式錯誤" }, { status: 400 });
  }
  if (typeof tonePresetId !== "string" || !tonePresetId) {
    return NextResponse.json({ error: "請選擇口吻範本" }, { status: 400 });
  }

  try {
    const post = await createPostFromUpload({
      images,
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
