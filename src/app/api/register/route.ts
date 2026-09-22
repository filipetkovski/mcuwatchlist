import { NextResponse, type NextRequest } from "next/server";
import { hashPassword } from "@/lib/password";
import { createSessionToken, withSessionCookie } from "@/lib/session";
import { admin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const db = admin();
  if (!db || !process.env.SESSION_SECRET) {
    return NextResponse.json({ error: "Server not configured." }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as {
    username?: unknown; password?: unknown; token?: unknown;
  } | null;
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const token = typeof body?.token === "string" ? body.token : "";

  if (!username || username.length > 50 || !password || password.length > 200 || !token) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { data: invite, error: tokenError } = await db
    .from("invite_tokens")
    .select("token, used_at")
    .eq("token", token)
    .maybeSingle();
  if (tokenError) return NextResponse.json({ error: "Couldn't validate invite." }, { status: 500 });
  if (!invite) return NextResponse.json({ error: "Invalid invite link." }, { status: 400 });
  if (invite.used_at) return NextResponse.json({ error: "This invite link has already been used." }, { status: 400 });

  const { data: user, error: userError } = await db
    .from("users")
    .insert({ username, password_hash: hashPassword(password), role: "user" })
    .select("id, username")
    .single();
  if (userError) {
    if (userError.code === "23505") return NextResponse.json({ error: "Username already taken." }, { status: 409 });
    return NextResponse.json({ error: "Couldn't create account." }, { status: 500 });
  }

  await db.from("invite_tokens").update({ used_at: new Date().toISOString(), used_by: user.id }).eq("token", token);

  const { token: sessionToken, expiresAt } = createSessionToken(user.id, user.username, "user", null);
  return withSessionCookie(
    NextResponse.json({ ok: true, username: user.username, role: "user", pathId: null, expiresAt }),
    sessionToken,
  );
}
