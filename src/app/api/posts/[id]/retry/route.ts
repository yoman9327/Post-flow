import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { publishGeneratedPost } from "@/lib/pipeline";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireSession("admin");
  if (denied) return denied;

  const { id } = await params;

  try {
    await publishGeneratedPost(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "重試失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
