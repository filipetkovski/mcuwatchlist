import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { GameCell, GameStatus, TicTacToeGame } from "@/lib/types";

export const TURN_SECONDS = 25;

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
  created_at: string;
  updated_at: string;
}

export const GAME_COLUMNS =
  "id, player_x, player_o, board, status, turn, winner, result, current_question_id, question_deadline, used_question_ids, created_at, updated_at";

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

/** If the current turn's deadline has passed, forfeits it (no mark placed) and starts the next turn. */
export async function expireIfNeeded(db: SupabaseClient, game: GameRow): Promise<GameRow> {
  if (game.status !== "active" || !game.question_deadline || !game.turn) return game;
  if (new Date(game.question_deadline).getTime() > Date.now()) return game;

  const nextTurn = game.turn === game.player_x ? game.player_o : game.player_x;
  const next = await pickQuestion(db, game.used_question_ids);
  if (!next) return game;

  const { data, error } = await db
    .from("tic_tac_toe_games")
    .update({
      turn: nextTurn,
      current_question_id: next.id,
      question_deadline: new Date(Date.now() + TURN_SECONDS * 1000).toISOString(),
      used_question_ids: next.usedIds,
    })
    .eq("id", game.id)
    .select(GAME_COLUMNS)
    .single();
  if (error || !data) return game;
  return data as GameRow;
}

export async function toClientGame(
  db: SupabaseClient,
  game: GameRow,
  viewerId: string,
): Promise<TicTacToeGame> {
  const { data: players } = await db.from("users").select("id, username").in("id", [game.player_x, game.player_o]);
  const byId = new Map((players ?? []).map((p) => [p.id as string, p.username as string]));

  let question = null;
  if (game.status === "active" && game.turn === viewerId && game.current_question_id) {
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
    createdAt: game.created_at,
    updatedAt: game.updated_at,
  };
}
