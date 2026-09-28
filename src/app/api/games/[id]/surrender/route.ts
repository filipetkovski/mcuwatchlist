import { NextResponse } from "next/server";
import { GAME_COLUMNS, toClientGame, type GameRow } from "@/lib/games";
import { guard } from "@/lib/session";
import { admin } from "@/lib/supabase/admin";
import { emitGameUpdate } from "@/lib/socket-server";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (!g.ok) return g.response;
  const db = admin();
  if (!db) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const { id } = await params;
  const { userId } = g.session;

  const { data, error } = await db.from("tic_tac_toe_games").select(GAME_COLUMNS).eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: "Couldn't load game." }, { status: 500 });
  const row = data as GameRow | null;
  if (!row) return NextResponse.json({ error: "Game not found." }, { status: 404 });
  if (row.player_x !== userId && row.player_o !== userId) {
    return NextResponse.json({ error: "Not your game." }, { status: 403 });
  }
  if (row.status !== "active") {
    return NextResponse.json({ error: "This game isn't active." }, { status: 409 });
  }

  const winnerId = row.player_x === userId ? row.player_o : row.player_x;

  const { data: updated, error: updateError } = await db
    .from("tic_tac_toe_games")
    .update({ status: "finished", result: "win", winner: winnerId, turn: null, current_question_id: null, question_deadline: null, question_order: null })
    .eq("id", id)
    .select(GAME_COLUMNS)
    .single();
  if (updateError || !updated) return NextResponse.json({ error: "Couldn't surrender." }, { status: 500 });

  await db.rpc("adjust_vibranium", { p_user_id: winnerId, p_delta: 100 });
  await db.rpc("adjust_vibranium", { p_user_id: userId, p_delta: -50 });

  const clientGame = await toClientGame(db, updated as GameRow);
  emitGameUpdate(id, updated.player_x, updated.player_o, clientGame, clientGame);
  return NextResponse.json({ game: clientGame });
}
