import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireSession } from "@/lib/api-guard";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/lib/database.types";

type SettingsUpdate = Database["public"]["Tables"]["settings"]["Update"];

export async function GET() {
  const denied = await requireSession("admin");
  if (denied) return denied;

  const { data, error } = await supabaseAdmin()
    .from("settings")
    .select("id, fb_page_id, fb_page_access_token, auto_publish, updated_at")
    .eq("id", 1)
    .single();

  if (error || !data) return NextResponse.json({ error: "讀取設定失敗" }, { status: 500 });

  // Never send the raw token back to the client — only whether one is set.
  return NextResponse.json({
    settings: {
      fb_page_id: data.fb_page_id,
      fb_page_access_token_set: !!data.fb_page_access_token,
      auto_publish: data.auto_publish,
      updated_at: data.updated_at,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const denied = await requireSession("admin");
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "無效的請求內容" }, { status: 400 });

  const update: SettingsUpdate = {};

  if (typeof body.fb_page_id === "string") update.fb_page_id = body.fb_page_id.trim();
  if (typeof body.fb_page_access_token === "string" && body.fb_page_access_token.trim()) {
    update.fb_page_access_token = body.fb_page_access_token.trim();
  }
  if (typeof body.auto_publish === "boolean") update.auto_publish = body.auto_publish;

  if (typeof body.new_admin_password === "string" && body.new_admin_password.length >= 6) {
    update.admin_password_hash = await bcrypt.hash(body.new_admin_password, 10);
  }
  if (typeof body.new_upload_password === "string" && body.new_upload_password.length >= 6) {
    update.upload_password_hash = await bcrypt.hash(body.new_upload_password, 10);
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "沒有可更新的欄位" }, { status: 400 });
  }
  update.updated_at = new Date().toISOString();

  const { error } = await supabaseAdmin().from("settings").update(update).eq("id", 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
