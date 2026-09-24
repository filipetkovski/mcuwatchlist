import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { GameCell, GameStatus, TicTacToeGame } from "@/lib/types";

export const TURN_SECONDS = 25;
/** Three missed turns loses the game outright; three wrong answers ends it in a draw. */
export const MAX_STRIKES = 3;

export const WIN_LINES: number[][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export function checkWinner(board: GameCell[]): GameCell {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return null;
}

export function isBoardFull(board: GameCell[]): boolean {
  return board.every((c) => c !== null);
}

export interface GameRow {
  id: string;
  player_x: string;
  player_o: string;
  board: GameCell[];
  status: GameStatus;
  turn: string | null;
  winner: string | null;
  result: "win" | "draw" | null;
  current_question_id: string | null;
  question_deadline: string | null;
  used_question_ids: string[];
  miss_count_x: number;
  miss_count_o: number;
  wrong_count_x: number;
  wrong_count_o: number;
  created_at: string;
  updated_at: string;
}

export const GAME_COLUMNS =
  "id, player_x, player_o, board, status, turn, winner, result, current_question_id, question_deadline, used_question_ids, miss_count_x, miss_count_o, wrong_count_x, wrong_count_o, created_at, updated_at";

async function updateGame(db: SupabaseClient, gameId: string, fields: Record<string, unknown>): Promise<GameRow | null> {
  const { data, error } = await db.from("tic_tac_toe_games").update(fields).eq("id", gameId).select(GAME_COLUMNS).single();
  if (error || !data) return null;
  return data as GameRow;
}

/** Picks a random question the game hasn't asked yet; reshuffles once the bank is exhausted. */
export async function pickQuestion(
  db: SupabaseClient,
  usedIds: string[],
): Promise<{ id: string; question: string; options: string[]; correctIndex: number; usedIds: string[] } | null> {
  const { data, error } = await db.from("trivia_questions").select("id, question, options, correct_index");
  if (error || !data || data.length === 0) return null;
  const unused = data.filter((q) => !usedIds.includes(q.id));
  const pool = unused.length > 0 ? unused : data;
  const baseUsed = unused.length > 0 ? usedIds : [];
  const picked = pool[Math.floor(Math.random() * pool.length)];
  return {
    id: picked.id,
    question: picked.question,
    options: picked.options as string[],
    correctIndex: picked.correct_index,
    usedIds: [...baseUsed, picked.id],
  };
}

/**
 * If the current turn's deadline has passed, counts a miss for whoever was on the clock.
 * Three misses loses them the game outright (their opponent wins); otherwise just that turn is
 * forfeited and play moves on.
 */
export async function expireIfNeeded(db: SupabaseClient, game: GameRow): Promise<GameRow> {
  if (game.status !== "active" || !game.question_deadline || !game.turn) return game;
  if (new Date(game.question_deadline).getTime() > Date.now()) return game;

  const missedBy = game.turn;
  const isX = missedBy === game.player_x;
  const misses = (isX ? game.miss_count_x : game.miss_count_o) + 1;
  const opponentId = isX ? game.player_o : game.player_x;
  const missCountField = isX ? "miss_count_x" : "miss_count_o";

  if (misses >= MAX_STRIKES) {
    const finished = await updateGame(db, game.id, {
      status: "finished",
      result: "win",
      winner: opponentId,
      turn: null,
      current_question_id: null,
      question_deadline: null,
      [missCountField]: misses,
    });
    if (!finished) return game;
    await db.rpc("adjust_vibranium", { p_user_id: opponentId, p_delta: 100 });
    await db.rpc("adjust_vibranium", { p_user_id: missedBy, p_delta: -50 });
    return finished;
  }

  const next = await pickQuestion(db, game.used_question_ids);
  if (!next) return game;

  const updated = await updateGame(db, game.id, {
    turn: opponentId,
    current_question_id: next.id,
    question_deadline: new Date(Date.now() + TURN_SECONDS * 1000).toISOString(),
    used_question_ids: next.usedIds,
    [missCountField]: misses,
  });
  return updated ?? game;
}

/**
 * Records a wrong answer for the given player. Three wrong answers ends the game as a draw;
 * otherwise the turn passes to the opponent with a new question.
 */
export async function applyWrongAnswer(db: SupabaseClient, game: GameRow, userId: string): Promise<GameRow | null> {
  const isX = userId === game.player_x;
  const wrong = (isX ? game.wrong_count_x : game.wrong_count_o) + 1;
  const opponentId = isX ? game.player_o : game.player_x;
  const wrongCountField = isX ? "wrong_count_x" : "wrong_count_o";

  if (wrong >= MAX_STRIKES) {
    const finished = await updateGame(db, game.id, {
      status: "finished",
      result: "draw",
      winner: null,
      turn: null,
      current_question_id: null,
      question_deadline: null,
      [wrongCountField]: wrong,
    });
    if (!finished) return null;
    await db.rpc("adjust_vibranium", { p_user_id: game.player_x, p_delta: -10 });
    await db.rpc("adjust_vibranium", { p_user_id: game.player_o, p_delta: -10 });
    return finished;
  }

  const next = await pickQuestion(db, game.used_question_ids);
  return updateGame(db, game.id, {
    turn: opponentId,
    current_question_id: next?.id ?? null,
    question_deadline: next ? new Date(Date.now() + TURN_SECONDS * 1000).toISOString() : null,
    used_question_ids: next?.usedIds ?? game.used_question_ids,
    [wrongCountField]: wrong,
  });
}

export async function toClientGame(db: SupabaseClient, game: GameRow): Promise<TicTacToeGame> {
  const { data: players } = await db.from("users").select("id, username").in("id", [game.player_x, game.player_o]);
  const byId = new Map((players ?? []).map((p) => [p.id as string, p.username as string]));

  let question = null;
  if (game.status === "active" && game.current_question_id) {
    const { data: q } = await db
      .from("trivia_questions")
      .select("id, question, options")
      .eq("id", game.current_question_id)
      .maybeSingle();
    if (q) question = { id: q.id as string, question: q.question as string, options: q.options as string[] };
  }

  return {
    id: game.id,
    playerX: { id: game.player_x, username: byId.get(game.player_x) ?? "Unknown" },
    playerO: { id: game.player_o, username: byId.get(game.player_o) ?? "Unknown" },
    board: game.board,
    status: game.status,
    turn: game.turn,
    winner: game.winner,
    result: game.result,
    question,
    deadline: game.status === "active" ? game.question_deadline : null,
    misses: { x: game.miss_count_x, o: game.miss_count_o },
    wrongAnswers: { x: game.wrong_count_x, o: game.wrong_count_o },
    createdAt: game.created_at,
    updatedAt: game.updated_at,
  };
}
