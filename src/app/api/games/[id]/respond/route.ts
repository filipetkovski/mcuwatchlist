import { NextResponse, type NextRequest } from "next/server";
import { GAME_COLUMNS, TURN_SECONDS, pickQuestion, toClientGame, type GameRow } from "@/lib/games";
import { guard } from "@/lib/session";
import { admin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (!g.ok) return g.response;
  const db = admin();
  if (!db) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { accept?: unknown } | null;
  if (typeof body?.accept !== "boolean") return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const { data, error } = await db.from("tic_tac_toe_games").select(GAME_COLUMNS).eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: "Couldn't load game." }, { status: 500 });
  const row = data as GameRow | null;
  if (!row) return NextResponse.json({ error: "Game not found." }, { status: 404 });
  if (row.player_o !== g.session.userId) return NextResponse.json({ error: "Not your invite." }, { status: 403 });
  if (row.status !== "pending") return NextResponse.json({ error: "This invite was already answered." }, { status: 409 });

  if (!body.accept) {
    const { data: declined, error: declineError } = await db
      .from("tic_tac_toe_games")
      .update({ status: "declined" })
      .eq("id", id)
      .select(GAME_COLUMNS)
      .single();
    if (declineError || !declined) return NextResponse.json({ error: "Couldn't decline." }, { status: 500 });
    return NextResponse.json({ game: await toClientGame(db, declined as GameRow, g.session.userId) });
  }

  const question = await pickQuestion(db, []);
  if (!question) return NextResponse.json({ error: "No trivia questions available." }, { status: 500 });

  const { data: started, error: startError } = await db
    .from("tic_tac_toe_games")
    .update({
      status: "active",
      turn: row.player_x,
      current_question_id: question.id,
      question_deadline: new Date(Date.now() + TURN_SECONDS * 1000).toISOString(),
      used_question_ids: question.usedIds,
    })
    .eq("id", id)
    .select(GAME_COLUMNS)
    .single();
  if (startError || !started) return NextResponse.json({ error: "Couldn't start the game." }, { status: 500 });

  return NextResponse.json({ game: await toClientGame(db, started as GameRow, g.session.userId) });
}
