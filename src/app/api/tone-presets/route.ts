import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { hasSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  // Both admins (managing presets) and uploaders (picking a preset) need this list.
  const isUploader = await hasSession("upload");
  const isAdmin = await hasSession("admin");
  if (!isUploader && !isAdmin) {
    return NextResponse.json({ error: "未授權，請先登入" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin()
    .from("tone_presets")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tonePresets: data });
}

export async function POST(req: NextRequest) {
  const denied = await requireSession("admin");
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const name = body?.name;
  const exampleText = body?.example_text;

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "請輸入口吻名稱" }, { status: 400 });
  }
  if (typeof exampleText !== "string" || !exampleText.trim()) {
    return NextResponse.json({ error: "請輸入口吻範例文字" }, { status: 400 });
  }

  const db = supabaseAdmin();

  if (body?.is_default) {
    await db.from("tone_presets").update({ is_default: false }).eq("is_default", true);
  }

  const { data, error } = await db
    .from("tone_presets")
    .insert({
      name: name.trim(),
      example_text: exampleText.trim(),
      is_default: !!body?.is_default,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tonePreset: data });
}
