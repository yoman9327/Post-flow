import { NextRequest, NextResponse } from "next/server";
import { createSession, destroySession, verifyPassword } from "@/lib/auth";

const VALID_KINDS = new Set(["admin", "upload"]);

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const kind = body?.kind;
  const password = body?.password;

  if (!VALID_KINDS.has(kind) || typeof password !== "string") {
    return NextResponse.json({ error: "缺少必要參數" }, { status: 400 });
  }

  const ok = await verifyPassword(kind, password);
  if (!ok) {
    return NextResponse.json({ error: "密碼錯誤" }, { status: 401 });
  }

  await createSession(kind);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const kind = req.nextUrl.searchParams.get("kind");
  if (!VALID_KINDS.has(kind || "")) {
    return NextResponse.json({ error: "缺少必要參數" }, { status: 400 });
  }
  await destroySession(kind as "admin" | "upload");
  return NextResponse.json({ ok: true });
}
