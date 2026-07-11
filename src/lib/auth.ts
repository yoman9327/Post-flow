import crypto from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Settings } from "@/lib/types";

export type SessionKind = "admin" | "upload";

const COOKIE_NAMES: Record<SessionKind, string> = {
  admin: "pf_admin_session",
  upload: "pf_upload_session",
};

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("Missing SESSION_SECRET environment variable");
  return s;
}

function sign(kind: SessionKind) {
  return crypto.createHmac("sha256", secret()).update(kind).digest("hex");
}

export async function getSettings(): Promise<Settings> {
  const { data, error } = await supabaseAdmin()
    .from("settings")
    .select("*")
    .eq("id", 1)
    .single();
  if (error || !data) throw new Error("Failed to load settings");
  return data as Settings;
}

/** Verifies a submitted password against the DB hash, falling back to the
 *  bootstrap env var when no password has been set yet in the admin UI. */
export async function verifyPassword(
  kind: SessionKind,
  submitted: string
): Promise<boolean> {
  const settings = await getSettings();
  const hash =
    kind === "admin" ? settings.admin_password_hash : settings.upload_password_hash;

  if (hash) {
    return bcrypt.compare(submitted, hash);
  }

  const bootstrap =
    kind === "admin" ? process.env.ADMIN_PASSWORD : process.env.UPLOAD_PASSWORD;
  if (!bootstrap) return false;
  return crypto.timingSafeEqual(
    Buffer.from(submitted.padEnd(64, "\0")),
    Buffer.from(bootstrap.padEnd(64, "\0"))
  );
}

export async function createSession(kind: SessionKind) {
  const store = await cookies();
  store.set(COOKIE_NAMES[kind], sign(kind), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function destroySession(kind: SessionKind) {
  const store = await cookies();
  store.delete(COOKIE_NAMES[kind]);
}

export async function hasSession(kind: SessionKind): Promise<boolean> {
  const store = await cookies();
  const value = store.get(COOKIE_NAMES[kind])?.value;
  if (!value) return false;
  return value === sign(kind);
}

export function cookieName(kind: SessionKind) {
  return COOKIE_NAMES[kind];
}
