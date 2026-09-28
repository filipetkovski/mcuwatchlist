import { NextResponse } from "next/server";
import { DRAFT_GAME_COLUMNS, toClientDraftGame, type DraftGameRow } from "@/lib/draft";
import { guard } from "@/lib/session";
import { admin } from "@/lib/supabase/admin";
import { emitDraftUpdate } from "@/lib/socket-server";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (!g.ok) return g.response;
  const db = admin();
  if (!db) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const { id } = await params;
  const { userId } = g.session;

  const { data, error } = await db.from("draft_games").select(DRAFT_GAME_COLUMNS).eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: "Couldn't load game." }, { status: 500 });
  const row = data as DraftGameRow | null;
  if (!row) return NextResponse.json({ error: "Game not found." }, { status: 404 });
  if (row.player_x !== userId && row.player_o !== userId) {
    return NextResponse.json({ error: "Not your game." }, { status: 403 });
  }
  if (row.status !== "active" && row.status !== "lineup") {
    return NextResponse.json({ error: "This draft isn't in progress." }, { status: 409 });
  }

  const winnerId = row.player_x === userId ? row.player_o : row.player_x;

  const { data: updated, error: updateError } = await db
    .from("draft_games")
    .update({ status: "finished", result: "win", winner: winnerId, turn: null })
    .eq("id", id)
    .select(DRAFT_GAME_COLUMNS)
    .single();
  if (updateError || !updated) return NextResponse.json({ error: "Couldn't surrender." }, { status: 500 });

  const u = updated as DraftGameRow;
  await db.rpc("adjust_vibranium", { p_user_id: winnerId, p_delta: 100 });
  await db.rpc("adjust_vibranium", { p_user_id: userId, p_delta: -50 });

  const [xState, oState] = await Promise.all([
    toClientDraftGame(db, u, u.player_x),
    toClientDraftGame(db, u, u.player_o),
  ]);
  emitDraftUpdate(id, u.player_x, u.player_o, xState, oState);
  return NextResponse.json({ game: userId === u.player_x ? xState : oState });
}
