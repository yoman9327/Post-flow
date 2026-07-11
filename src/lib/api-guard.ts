import { NextResponse } from "next/server";
import { hasSession, type SessionKind } from "@/lib/auth";

/** Returns a 401 response if the request lacks a valid session cookie, else null. */
export async function requireSession(kind: SessionKind): Promise<NextResponse | null> {
  const ok = await hasSession(kind);
  if (!ok) {
    return NextResponse.json({ error: "未授權，請先登入" }, { status: 401 });
  }
  return null;
}
