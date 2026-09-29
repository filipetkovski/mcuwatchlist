import { NextResponse } from "next/server";
import { getAlbumState } from "@/lib/album";
import { guard } from "@/lib/session";
import { admin } from "@/lib/supabase/admin";

export async function GET() {
  const g = await guard();
  if (!g.ok) return g.response;
  const db = admin();
  if (!db) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const state = await getAlbumState(db, g.session.userId);
  return NextResponse.json(state);
}
