import { NextResponse } from "next/server";
import { createSessionToken, guard, withSessionCookie } from "@/lib/session";
import { admin } from "@/lib/supabase/admin";

export async function POST() {
  const g = await guard();
  if (!g.ok) return g.response;
  const { session } = g;

  const db = admin();
  if (!db) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const { error } = await db.from("users").update({ ratings_notice_seen: true }).eq("id", session.userId);
  if (error) return NextResponse.json({ error: "Couldn't save that." }, { status: 500 });

  const { token, expiresAt } = createSessionToken(session.userId, session.username, session.role, session.pathId, true);
  return withSessionCookie(NextResponse.json({ ok: true, expiresAt }), token);
}
