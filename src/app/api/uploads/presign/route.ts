import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { hasSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { MAX_IMAGES_PER_POST } from "@/lib/pipeline";
import { isSupportedImageType } from "@/lib/claude";

const BUCKET = "post-images";

export async function POST(req: NextRequest) {
  const isUploader = await hasSession("upload");
  const isAdmin = await hasSession("admin");
  if (!isUploader && !isAdmin) {
    return NextResponse.json({ error: "未授權，請先登入" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const mimeTypes = body?.mimeTypes;
  if (!Array.isArray(mimeTypes) || mimeTypes.length === 0) {
    return NextResponse.json({ error: "缺少檔案資訊" }, { status: 400 });
  }
  if (mimeTypes.length > MAX_IMAGES_PER_POST) {
    return NextResponse.json(
      { error: `一次最多上傳 ${MAX_IMAGES_PER_POST} 張圖片` },
      { status: 400 }
    );
  }
  for (const mime of mimeTypes) {
    if (typeof mime !== "string" || !isSupportedImageType(mime)) {
      return NextResponse.json({ error: `不支援的圖片格式：${mime}` }, { status: 400 });
    }
  }

  const db = supabaseAdmin();
  const datePrefix = new Date().toISOString().slice(0, 10);

  try {
    const uploads = await Promise.all(
      mimeTypes.map(async (mime: string) => {
        const ext = mime.split("/")[1] || "jpg";
        const path = `${datePrefix}/${randomUUID()}.${ext}`;
        const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(path);
        if (error || !data) throw new Error(error?.message || "產生上傳網址失敗");
        return { path, signedUrl: data.signedUrl, token: data.token };
      })
    );
    return NextResponse.json({ uploads });
  } catch (err) {
    const message = err instanceof Error ? err.message : "產生上傳網址失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
