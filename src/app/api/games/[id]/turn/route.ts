import { NextResponse, type NextRequest } from "next/server";
import {
  GAME_COLUMNS,
  TURN_SECONDS,
  applyWrongAnswer,
  checkWinner,
  expireIfNeeded,
  isBoardFull,
  pickQuestion,
  toClientGame,
  type GameRow,
} from "@/lib/games";
import { guard } from "@/lib/session";
import { admin } from "@/lib/supabase/admin";
import type { GameCell } from "@/lib/types";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (!g.ok) return g.response;
  const db = admin();
  if (!db) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const { id } = await params;
  const { userId } = g.session;
  const body = (await req.json().catch(() => null)) as { answerIndex?: unknown; cellIndex?: unknown } | null;
  const answerIndex = body?.answerIndex;
  const cellIndex = body?.cellIndex;
  if (
    typeof answerIndex !== "number" || !Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex > 3 ||
    typeof cellIndex !== "number" || !Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex > 8
  ) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { data, error } = await db.from("tic_tac_toe_games").select(GAME_COLUMNS).eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: "Couldn't load game." }, { status: 500 });
  let row = data as GameRow | null;
  if (!row) return NextResponse.json({ error: "Game not found." }, { status: 404 });
  if (row.player_x !== userId && row.player_o !== userId) {
    return NextResponse.json({ error: "Not your game." }, { status: 403 });
  }

  row = await expireIfNeeded(db, row);
  if (row.status !== "active") return NextResponse.json({ error: "This game isn't active." }, { status: 409 });
  if (row.turn !== userId) return NextResponse.json({ error: "It's not your turn anymore." }, { status: 409 });
  if (row.board[cellIndex] !== null) return NextResponse.json({ error: "That square is already taken." }, { status: 400 });

  const { data: questionRow, error: questionError } = await db
    .from("trivia_questions")
    .select("correct_index")
    .eq("id", row.current_question_id ?? "")
    .maybeSingle();
  if (questionError || !questionRow) return NextResponse.json({ error: "Couldn't load the question." }, { status: 500 });

  const mark: GameCell = row.player_x === userId ? "X" : "O";
  const opponentId = row.player_x === userId ? row.player_o : row.player_x;
  const correct = answerIndex === questionRow.correct_index;

  if (!correct) {
    const updated = await applyWrongAnswer(db, row, userId);
    if (!updated) return NextResponse.json({ error: "Couldn't save your answer." }, { status: 500 });
    return NextResponse.json({ game: await toClientGame(db, updated), correct: false });
  }

  const board = [...row.board];
  board[cellIndex] = mark;
  const winnerMark = checkWinner(board);

  if (winnerMark) {
    const { data: updated, error: updateError } = await db
      .from("tic_tac_toe_games")
      .update({
        board,
        status: "finished",
        result: "win",
        winner: userId,
        turn: null,
        current_question_id: null,
        question_deadline: null,
      })
      .eq("id", id)
      .select(GAME_COLUMNS)
      .single();
    if (updateError || !updated) return NextResponse.json({ error: "Couldn't save your move." }, { status: 500 });
    await db.rpc("adjust_vibranium", { p_user_id: userId, p_delta: 100 });
    await db.rpc("adjust_vibranium", { p_user_id: opponentId, p_delta: -50 });
    return NextResponse.json({ game: await toClientGame(db, updated as GameRow), correct: true });
  }

  if (isBoardFull(board)) {
    const { data: updated, error: updateError } = await db
      .from("tic_tac_toe_games")
      .update({
        board,
        status: "finished",
        result: "draw",
        winner: null,
        turn: null,
        current_question_id: null,
        question_deadline: null,
      })
      .eq("id", id)
      .select(GAME_COLUMNS)
      .single();
    if (updateError || !updated) return NextResponse.json({ error: "Couldn't save your move." }, { status: 500 });
    await db.rpc("adjust_vibranium", { p_user_id: row.player_x, p_delta: -10 });
    await db.rpc("adjust_vibranium", { p_user_id: row.player_o, p_delta: -10 });
    return NextResponse.json({ game: await toClientGame(db, updated as GameRow), correct: true });
  }

  const next = await pickQuestion(db, row.used_question_ids);
  const { data: updated, error: updateError } = await db
    .from("tic_tac_toe_games")
    .update({
      board,
      turn: opponentId,
      current_question_id: next?.id ?? null,
      question_deadline: next ? new Date(Date.now() + TURN_SECONDS * 1000).toISOString() : null,
      used_question_ids: next?.usedIds ?? row.used_question_ids,
    })
    .eq("id", id)
    .select(GAME_COLUMNS)
    .single();
  if (updateError || !updated) return NextResponse.json({ error: "Couldn't save your move." }, { status: 500 });
  return NextResponse.json({ game: await toClientGame(db, updated as GameRow), correct: true });
}
