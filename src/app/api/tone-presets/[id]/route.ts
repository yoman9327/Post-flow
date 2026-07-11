import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/lib/database.types";

type ToneUpdate = Database["public"]["Tables"]["tone_presets"]["Update"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireSession("admin");
  if (denied) return denied;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "無效的請求內容" }, { status: 400 });

  const db = supabaseAdmin();

  const update: ToneUpdate = {};
  if (typeof body.name === "string") update.name = body.name.trim();
  if (typeof body.example_text === "string") update.example_text = body.example_text.trim();
  if (typeof body.is_default === "boolean") update.is_default = body.is_default;

  if (body.is_default === true) {
    await db.from("tone_presets").update({ is_default: false }).eq("is_default", true);
  }

  const { data, error } = await db
    .from("tone_presets")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tonePreset: data });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireSession("admin");
  if (denied) return denied;

  const { id } = await params;
  const { error } = await supabaseAdmin().from("tone_presets").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
