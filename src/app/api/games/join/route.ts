import { NextResponse } from "next/server";
import { guard } from "@/lib/session";
import { admin } from "@/lib/supabase/admin";

export async function POST() {
  const g = await guard();
  if (!g.ok) return g.response;
  const db = admin();
  if (!db) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const { error } = await db.from("users").update({ tic_tac_toe_joined: true }).eq("id", g.session.userId);
  if (error) return NextResponse.json({ error: "Couldn't join." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
