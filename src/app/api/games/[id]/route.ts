import { NextResponse } from "next/server";
import { GAME_COLUMNS, expireIfNeeded, toClientGame, type GameRow } from "@/lib/games";
import { guard } from "@/lib/session";
import { admin } from "@/lib/supabase/admin";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (!g.ok) return g.response;
  const db = admin();
  if (!db) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const { id } = await params;
  const { data, error } = await db.from("tic_tac_toe_games").select(GAME_COLUMNS).eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: "Couldn't load game." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Game not found." }, { status: 404 });

  const row = data as GameRow;
  if (row.player_x !== g.session.userId && row.player_o !== g.session.userId) {
    return NextResponse.json({ error: "Not your game." }, { status: 403 });
  }

  const current = await expireIfNeeded(db, row);
  return NextResponse.json({ game: await toClientGame(db, current) });
}
