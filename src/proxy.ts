import { NextRequest, NextResponse } from "next/server";

// Middleware runs on the Edge runtime, which has no Node `crypto` module —
// this re-implements the same HMAC check as src/lib/auth.ts using Web Crypto.
const COOKIE = { admin: "pf_admin_session", upload: "pf_upload_session" } as const;

async function sign(kind: "admin" | "upload", secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(kind));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function isValid(req: NextRequest, kind: "admin" | "upload") {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;
  const cookie = req.cookies.get(COOKIE[kind])?.value;
  return !!cookie && cookie === (await sign(kind, secret));
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!(await isValid(req, "admin"))) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  if (pathname === "/upload") {
    if (!(await isValid(req, "upload")) && !(await isValid(req, "admin"))) {
      return NextResponse.redirect(new URL("/upload/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/upload"],
};
