import { NextResponse, type NextRequest } from "next/server";
import { verifyPassword } from "@/lib/password";
import { clearSessionCookie, createSessionToken, currentSession, withSessionCookie } from "@/lib/session";
import { admin } from "@/lib/supabase/admin";
import type { PathId, UserRole } from "@/lib/types";

const MAX_MISSES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const misses = new Map<string, { count: number; resetAt: number }>();
const clientKey = (req: NextRequest) => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function GET() {
  const configured = Boolean(admin() && process.env.SESSION_SECRET);
  if (!configured) return NextResponse.json({ configured: false, authenticated: false });
  const session = await currentSession();
  if (!session) return NextResponse.json({ configured: true, authenticated: false });
  return NextResponse.json({
    configured: true,
    authenticated: true,
    userId: session.userId,
    username: session.username,
    role: session.role,
    pathId: session.pathId,
    expiresAt: session.expiresAt,
  });
}

export async function POST(req: NextRequest) {
  const db = admin();
  if (!db || !process.env.SESSION_SECRET) {
    return NextResponse.json({ error: "The server isn't configured yet. Fill in .env.local and run npm run db:setup." }, { status: 503 });
  }

  const key = clientKey(req);
  const entry = misses.get(key);
  if (entry && entry.resetAt > Date.now() && entry.count >= MAX_MISSES) {
    return NextResponse.json({ error: "Too many wrong tries. Wait a few minutes and try again." }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as { username?: unknown; password?: unknown } | null;
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!username || !password || username.length > 50 || password.length > 200) {
    return NextResponse.json({ error: "Enter your username and password." }, { status: 400 });
  }

  const { data, error } = await db
    .from("users")
    .select("id, username, password_hash, role, path_id")
    .eq("username", username)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Couldn't check credentials. Is the database set up?" }, { status: 503 });

  const recordMiss = () => {
    const now = Date.now();
    const cur = entry && entry.resetAt > now ? entry : { count: 0, resetAt: now + WINDOW_MS };
    misses.set(key, { count: cur.count + 1, resetAt: cur.resetAt });
  };

  if (!data || !verifyPassword(password, data.password_hash)) {
    recordMiss();
    await sleep(400);
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
  }

  misses.delete(key);
  const { token, expiresAt } = createSessionToken(
    data.id,
    data.username,
    data.role as UserRole,
    (data.path_id as PathId) ?? null,
  );
  return withSessionCookie(
    NextResponse.json({ ok: true, userId: data.id, username: data.username, role: data.role, pathId: data.path_id ?? null, expiresAt }),
    token,
  );
}

export async function DELETE() {
  return clearSessionCookie(NextResponse.json({ ok: true }));
}
