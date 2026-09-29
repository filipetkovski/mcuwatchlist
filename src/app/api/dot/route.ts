import { NextResponse, type NextRequest } from "next/server";
import { guard } from "@/lib/session";
import { admin } from "@/lib/supabase/admin";

const MAX_CLICKS = 500;

export async function POST(req: NextRequest) {
  const g = await guard();
  if (!g.ok) return g.response;
  const db = admin();
  if (!db) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const body = (await req.json().catch(() => null)) as { clicks?: unknown } | null;
  const clicks = body?.clicks;
  if (typeof clicks !== "number" || !Number.isInteger(clicks) || clicks < 1) {
    return NextResponse.json({ error: "Invalid clicks." }, { status: 400 });
  }
  const awarded = Math.min(clicks, MAX_CLICKS);

  const { data, error } = await db.rpc("adjust_vibranium", {
    p_user_id: g.session.userId,
    p_delta: awarded,
  });
  if (error || data === null) return NextResponse.json({ error: "Couldn't award vibranium." }, { status: 500 });

  const { data: userRow } = await db.from("users").select("vibranium").eq("id", g.session.userId).single();
  return NextResponse.json({ awarded, vibranium: userRow?.vibranium ?? 0 });
}
