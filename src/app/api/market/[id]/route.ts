import { NextResponse } from "next/server";
import { cancelListing } from "@/lib/market";
import { guard } from "@/lib/session";
import { admin } from "@/lib/supabase/admin";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (!g.ok) return g.response;
  const db = admin();
  if (!db) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const { id } = await params;
  const ok = await cancelListing(db, id, g.session.userId);
  if (!ok) return NextResponse.json({ error: "Couldn't cancel that listing." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
