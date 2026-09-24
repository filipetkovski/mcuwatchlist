import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { PathId, UserRole, UserSession } from "@/lib/types";

export const SESSION_COOKIE = "mcuw_session";
export const SESSION_TTL_SECONDS = 60 * 60;

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET must be set to a random string of 32+ characters.");
  return value;
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function createSessionToken(
  userId: string,
  username: string,
  role: UserRole,
  pathId: PathId | null,
  ratingsNoticeSeen: boolean,
  now = Date.now(),
): { token: string; expiresAt: number } {
  const expiresAt = now + SESSION_TTL_SECONDS * 1000;
  const payload = Buffer.from(
    JSON.stringify({ exp: expiresAt, userId, username, role, pathId, ratingsNoticeSeen }),
  ).toString("base64url");
  return { token: `${payload}.${sign(payload)}`, expiresAt };
}

export function readSessionToken(token: string | undefined | null, now = Date.now()): UserSession | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const d = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      exp?: unknown; userId?: unknown; username?: unknown; role?: unknown; pathId?: unknown; ratingsNoticeSeen?: unknown;
    };
    if (typeof d.exp !== "number" || d.exp <= now) return null;
    if (typeof d.userId !== "string" || typeof d.username !== "string") return null;
    if (d.role !== "admin" && d.role !== "user") return null;
    return {
      userId: d.userId,
      username: d.username,
      role: d.role,
      pathId: (d.pathId as PathId) ?? null,
      ratingsNoticeSeen: d.ratingsNoticeSeen === true,
      expiresAt: d.exp,
    };
  } catch {
    return null;
  }
}

export async function currentSession(): Promise<UserSession | null> {
  const store = await cookies();
  return readSessionToken(store.get(SESSION_COOKIE)?.value);
}

export function withSessionCookie(res: NextResponse, token: string): NextResponse {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}

export function clearSessionCookie(res: NextResponse): NextResponse {
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}

export type GuardResult = { ok: true; session: UserSession } | { ok: false; response: NextResponse };

export async function guard(): Promise<GuardResult> {
  if (!process.env.SESSION_SECRET) {
    return { ok: false, response: NextResponse.json({ error: "Server is missing SESSION_SECRET." }, { status: 503 }) };
  }
  const session = await currentSession();
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: "Locked" }, { status: 401 }) };
  }
  return { ok: true, session };
}
