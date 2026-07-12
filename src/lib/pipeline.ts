import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { generateCaption, isSupportedImageType } from "@/lib/claude";
import { publishPhotoPost, FacebookPublishError } from "@/lib/facebook";
import { getSettings } from "@/lib/auth";
import type { Post, TonePreset } from "@/lib/types";

const BUCKET = "post-images";

export async function createPostFromUpload(params: {
  file: File;
  tonePresetId: string;
  uploaderLabel?: string | null;
}): Promise<Post> {
  const { file, tonePresetId, uploaderLabel } = params;
  const db = supabaseAdmin();

  if (!isSupportedImageType(file.type)) {
    throw new Error(`不支援的圖片格式：${file.type}`);
  }

  const { data: tone, error: toneError } = await db
    .from("tone_presets")
    .select("*")
    .eq("id", tonePresetId)
    .single();
  if (toneError || !tone) throw new Error("找不到指定的口吻範本");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = file.type.split("/")[1] || "jpg";
  const path = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${ext}`;

  const { error: uploadError } = await db.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (uploadError) throw new Error(`圖片上傳失敗：${uploadError.message}`);

  const { data: publicUrlData } = db.storage.from(BUCKET).getPublicUrl(path);
  const imageUrl = publicUrlData.publicUrl;

  const { data: post, error: insertError } = await db
    .from("posts")
    .insert({
      image_path: path,
      image_url: imageUrl,
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
  await processPost(post as Post, tone as TonePreset, bytes, file.type);

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
  imageBytes: Uint8Array,
  mimeType: string
) {
  const db = supabaseAdmin();

  try {
    const caption = await generateCaption({
      imageBase64: Buffer.from(imageBytes).toString("base64"),
      mediaType: mimeType as Parameters<typeof generateCaption>[0]["mediaType"],
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
    const { postId: fbPostId } = await publishPhotoPost({
      pageId: settings.fb_page_id,
      accessToken: settings.fb_page_access_token,
      imageUrl: post.image_url,
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
