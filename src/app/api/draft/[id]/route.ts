import { NextResponse } from "next/server";
import { DRAFT_GAME_COLUMNS, toClientDraftGame, type DraftGameRow } from "@/lib/draft";
import { guard } from "@/lib/session";
import { admin } from "@/lib/supabase/admin";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (!g.ok) return g.response;
  const db = admin();
  if (!db) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const { id } = await params;
  const { data, error } = await db.from("draft_games").select("id, player_x, status").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: "Couldn't load game." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Game not found." }, { status: 404 });
  if (data.player_x !== g.session.userId) return NextResponse.json({ error: "Only the challenger can withdraw an invite." }, { status: 403 });
  if (data.status !== "pending") return NextResponse.json({ error: "This invite can no longer be withdrawn." }, { status: 409 });

  const { error: delError } = await db.from("draft_games").delete().eq("id", id);
  if (delError) return NextResponse.json({ error: "Couldn't withdraw the invite." }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (!g.ok) return g.response;
  const db = admin();
  if (!db) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const { id } = await params;
  const { data, error } = await db.from("draft_games").select(DRAFT_GAME_COLUMNS).eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: "Couldn't load game." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Game not found." }, { status: 404 });

  const row = data as DraftGameRow;
  if (row.player_x !== g.session.userId && row.player_o !== g.session.userId) {
    return NextResponse.json({ error: "Not your game." }, { status: 403 });
  }

  return NextResponse.json({ game: await toClientDraftGame(db, row) });
}
