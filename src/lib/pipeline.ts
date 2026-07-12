import { supabaseAdmin } from "@/lib/supabase/admin";
import { generateCaption, isSupportedImageType } from "@/lib/claude";
import { publishPost, FacebookPublishError } from "@/lib/facebook";
import { getSettings } from "@/lib/auth";
import type { Post, TonePreset } from "@/lib/types";

const BUCKET = "post-images";
export const MAX_IMAGES_PER_POST = 10;

/**
 * Creates a post from images the client already uploaded directly to
 * Supabase Storage (via a signed URL from /api/uploads/presign). We only
 * receive lightweight paths/mime types here — never raw file bytes — since
 * Vercel serverless functions hard-cap request bodies at 4.5MB.
 */
export async function createPostFromUpload(params: {
  images: { path: string; mimeType: string }[];
  tonePresetId: string;
  uploaderLabel?: string | null;
}): Promise<Post> {
  const { images, tonePresetId, uploaderLabel } = params;
  const db = supabaseAdmin();

  if (images.length === 0) throw new Error("請至少選擇一張圖片");
  if (images.length > MAX_IMAGES_PER_POST) {
    throw new Error(`一次最多上傳 ${MAX_IMAGES_PER_POST} 張圖片`);
  }
  for (const img of images) {
    if (!isSupportedImageType(img.mimeType)) {
      throw new Error(`不支援的圖片格式：${img.mimeType}`);
    }
  }

  const { data: tone, error: toneError } = await db
    .from("tone_presets")
    .select("*")
    .eq("id", tonePresetId)
    .single();
  if (toneError || !tone) throw new Error("找不到指定的口吻範本");

  // Paths came from our own presign endpoint, so they're safe to trust here.
  // If a client somehow claims a path nothing was ever uploaded to, the
  // download in processPost below fails and the post is marked "failed".
  const publicUrls = images.map((img) => {
    const { data } = db.storage.from(BUCKET).getPublicUrl(img.path);
    return data.publicUrl;
  });

  const { data: post, error: insertError } = await db
    .from("posts")
    .insert({
      image_paths: images.map((img) => img.path),
      image_urls: publicUrls,
      tone_preset_id: tonePresetId,
      uploader_label: uploaderLabel || null,
      status: "generating",
    })
    .select("*")
    .single();
  if (insertError || !post) throw new Error("建立貼文紀錄失敗");

  // Await the full generate+publish pipeline synchronously so it completes
  // before the serverless request ends (background "fire and forget" work
  // is not guaranteed to run to completion once the response is sent).
  await processPost(post as Post, tone as TonePreset, images);

  const { data: finalPost } = await db
    .from("posts")
    .select("*")
    .eq("id", post.id)
    .single();

  return (finalPost as Post) ?? (post as Post);
}

async function processPost(
  post: Post,
  tone: TonePreset,
  images: { path: string; mimeType: string }[]
) {
  const db = supabaseAdmin();

  try {
    const downloaded = await Promise.all(
      images.map(async (img) => {
        const { data, error } = await db.storage.from(BUCKET).download(img.path);
        if (error || !data) throw new Error(`讀取圖片失敗：${img.path}`);
        const bytes = new Uint8Array(await data.arrayBuffer());
        return { bytes, mimeType: img.mimeType };
      })
    );

    const caption = await generateCaption({
      images: downloaded.map((img) => ({
        imageBase64: Buffer.from(img.bytes).toString("base64"),
        mediaType: img.mimeType as Parameters<
          typeof generateCaption
        >[0]["images"][number]["mediaType"],
      })),
      toneName: tone.name,
      toneExample: tone.example_text,
      uploaderNote: post.uploader_label,
    });

    await db
      .from("posts")
      .update({ caption, status: "generated" })
      .eq("id", post.id);

    const settings = await getSettings();
    if (!settings.auto_publish) return;

    await publishGeneratedPost(post.id);
  } catch (err) {
    await db
      .from("posts")
      .update({
        status: "failed",
        error_message: err instanceof Error ? err.message : "未知錯誤",
      })
      .eq("id", post.id);
  }
}

export async function publishGeneratedPost(postId: string) {
  const db = supabaseAdmin();

  const { data: post, error } = await db
    .from("posts")
    .select("*")
    .eq("id", postId)
    .single();
  if (error || !post) throw new Error("找不到貼文");
  if (!post.caption) throw new Error("貼文尚未產生文案");

  const settings = await getSettings();
  if (!settings.fb_page_id || !settings.fb_page_access_token) {
    await db
      .from("posts")
      .update({
        status: "failed",
        error_message: "尚未設定 Facebook 粉專 Page ID / Access Token",
      })
      .eq("id", postId);
    throw new Error("尚未設定 Facebook 粉專 Page ID / Access Token");
  }

  await db.from("posts").update({ status: "publishing" }).eq("id", postId);

  try {
    const { postId: fbPostId } = await publishPost({
      pageId: settings.fb_page_id,
      accessToken: settings.fb_page_access_token,
      imageUrls: post.image_urls,
      caption: post.caption,
    });

    await db
      .from("posts")
      .update({
        status: "published",
        fb_post_id: fbPostId,
        published_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", postId);
  } catch (err) {
    const message =
      err instanceof FacebookPublishError || err instanceof Error
        ? err.message
        : "發文失敗";
    await db
      .from("posts")
      .update({ status: "failed", error_message: message })
      .eq("id", postId);
    throw err;
  }
}
