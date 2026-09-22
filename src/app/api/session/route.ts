import { NextResponse, type NextRequest } from "next/server";
import { verifyPassword } from "@/lib/password";
import { clearSessionCookie, createSessionToken, currentSession, withSessionCookie } from "@/lib/session";
import { admin } from "@/lib/supabase/admin";

// Best-effort brute-force throttle (per server instance): 5 misses per IP per 15 minutes.
const MAX_MISSES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const misses = new Map<string, { count: number; resetAt: number }>();

const clientKey = (req: NextRequest) => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function GET() {
  const configured = Boolean(admin() && process.env.SESSION_SECRET);
  if (!configured) return NextResponse.json({ configured: false, authenticated: false });
  const session = await currentSession();
  return NextResponse.json({ configured: true, authenticated: Boolean(session), expiresAt: session?.expiresAt ?? null });
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

  const body = (await req.json().catch(() => null)) as { password?: unknown } | null;
  const password = typeof body?.password === "string" ? body.password : "";
  if (!password || password.length > 200) return NextResponse.json({ error: "Enter the password." }, { status: 400 });

  const { data, error } = await db.from("site_password").select("password_hash").eq("id", true).maybeSingle();
  if (error) return NextResponse.json({ error: "Couldn't check the password. Is the database set up?" }, { status: 503 });
  if (!data) return NextResponse.json({ error: "No password has been set yet. Run npm run db:setup." }, { status: 503 });

  if (!verifyPassword(password, data.password_hash)) {
    const now = Date.now();
    const current = entry && entry.resetAt > now ? entry : { count: 0, resetAt: now + WINDOW_MS };
    misses.set(key, { count: current.count + 1, resetAt: current.resetAt });
    await sleep(400);
    return NextResponse.json({ error: "That's not the password." }, { status: 401 });
  }

  misses.delete(key);
  const { token, expiresAt } = createSessionToken();
  return withSessionCookie(NextResponse.json({ ok: true, expiresAt }), token);
}

export async function DELETE() {
  return clearSessionCookie(NextResponse.json({ ok: true }));
}
