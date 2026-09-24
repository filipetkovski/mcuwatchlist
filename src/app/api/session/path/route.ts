import { NextResponse, type NextRequest } from "next/server";
import { createSessionToken, guard, withSessionCookie } from "@/lib/session";
import { admin } from "@/lib/supabase/admin";
import type { PathId } from "@/lib/types";

const VALID_PATHS: PathId[] = ["new-to-marvel", "prepare-for-doomsday", "rewatch-essentials"];

export async function POST(req: NextRequest) {
  const g = await guard();
  if (!g.ok) return g.response;
  const { session } = g;

  const db = admin();
  if (!db) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const body = (await req.json().catch(() => null)) as { pathId?: unknown } | null;
  const pathId = typeof body?.pathId === "string" ? (body.pathId as PathId) : null;
  if (!pathId || !VALID_PATHS.includes(pathId)) {
    return NextResponse.json({ error: "Invalid path." }, { status: 400 });
  }

  const { error } = await db.from("users").update({ path_id: pathId }).eq("id", session.userId);
  if (error) return NextResponse.json({ error: "Couldn't save path." }, { status: 500 });

  const { token, expiresAt } = createSessionToken(session.userId, session.username, session.role, pathId, session.ratingsNoticeSeen);
  return withSessionCookie(NextResponse.json({ ok: true, pathId, expiresAt }), token);
}
