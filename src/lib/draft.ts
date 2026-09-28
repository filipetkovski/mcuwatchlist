import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DRAFT_CHARACTERS } from "@/data/draft-characters";
import type { DraftGame, DraftPick } from "@/lib/types";

export const STARTING_BUDGET = 20;
export const CHARACTERS_PER_GAME = 10;
export const PICKS_TO_WIN = CHARACTERS_PER_GAME / 2;

export interface DraftGameRow {
  id: string;
  player_x: string;
  player_o: string;
  status: "pending" | "active" | "finished" | "declined";
  character_ids: string[];
  round: number;
  first_bidder: string | null;
  turn: string | null;
  current_bid: number;
  current_bidder: string | null;
  budget_x: number;
  budget_o: number;
  picks_x: DraftPick[];
  picks_o: DraftPick[];
  winner: string | null;
  result: "win" | "draw" | null;
  created_at: string;
  updated_at: string;
}

export const DRAFT_GAME_COLUMNS =
  "id, player_x, player_o, status, character_ids, round, first_bidder, turn, current_bid, current_bidder, budget_x, budget_o, picks_x, picks_o, winner, result, created_at, updated_at";

async function updateDraftGame(db: SupabaseClient, gameId: string, fields: Record<string, unknown>): Promise<DraftGameRow | null> {
  const { data, error } = await db.from("draft_games").update(fields).eq("id", gameId).select(DRAFT_GAME_COLUMNS).single();
  if (error || !data) return null;
  return data as DraftGameRow;
}

/** A random selection of CHARACTERS_PER_GAME character ids, in reveal order. */
export function pickCharacterIds(): string[] {
  const ids = DRAFT_CHARACTERS.map((c) => c.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.slice(0, CHARACTERS_PER_GAME);
}

function otherPlayer(row: DraftGameRow, userId: string): string {
  return userId === row.player_x ? row.player_o : row.player_x;
}

function budgetOf(row: DraftGameRow, userId: string): number {
  return userId === row.player_x ? row.budget_x : row.budget_o;
}

function picksOf(row: DraftGameRow, userId: string): DraftPick[] {
  return userId === row.player_x ? row.picks_x : row.picks_o;
}

function budgetField(row: DraftGameRow, userId: string): "budget_x" | "budget_o" {
  return userId === row.player_x ? "budget_x" : "budget_o";
}

function picksField(row: DraftGameRow, userId: string): "picks_x" | "picks_o" {
  return userId === row.player_x ? "picks_x" : "picks_o";
}

/** Whose turn it is to open the bidding for a given round, alternating from the game's first bidder. */
export function starterFor(row: DraftGameRow, round: number): string {
  const starter = row.first_bidder ?? row.player_x;
  return round % 2 === 0 ? starter : otherPlayer(row, starter);
}

function powerOf(characterId: string): number {
  return DRAFT_CHARACTERS.find((c) => c.id === characterId)?.power ?? 0;
}

function totalPower(picks: DraftPick[]): number {
  return picks.reduce((sum, p) => sum + powerOf(p.characterId), 0);
}

/**
 * Validates a bid for the character currently up for auction. An opening bid (no current bidder
 * yet) may be as low as 0 - forced when the bidder is out of money. A raise must strictly beat the
 * current bid and never exceed the bidder's remaining budget.
 */
export function validateBid(row: DraftGameRow, userId: string, amount: number): string | null {
  if (!Number.isInteger(amount) || amount < 0) return "Invalid bid.";
  const budget = budgetOf(row, userId);
  if (amount > budget) return "You don't have that much money left.";
  if (row.current_bidder === null) return null;
  if (amount <= row.current_bid) return "Your bid must beat the current bid - or pass.";
  return null;
}

export async function applyBid(db: SupabaseClient, row: DraftGameRow, userId: string, amount: number): Promise<DraftGameRow | null> {
  return updateDraftGame(db, row.id, {
    current_bid: amount,
    current_bidder: userId,
    turn: otherPlayer(row, userId),
  });
}

/**
 * Concedes the current character to whoever holds the current bid (there must be one - the round
 * always has to be opened with a bid first). Deducts their payment, records the pick, and either
 * starts the next round or - once a player reaches PICKS_TO_WIN - hands the rest of the list
 * straight to the other player and ends the game.
 */
export async function applyPass(db: SupabaseClient, row: DraftGameRow): Promise<DraftGameRow | null> {
  if (row.current_bidder === null) return null;
  const winnerId = row.current_bidder;
  const price = row.current_bid;
  const characterId = row.character_ids[row.round];

  const winnerPicks = [...picksOf(row, winnerId), { characterId, price }];
  const fields: Record<string, unknown> = {
    [budgetField(row, winnerId)]: budgetOf(row, winnerId) - price,
    [picksField(row, winnerId)]: winnerPicks,
    current_bid: 0,
    current_bidder: null,
  };

  if (winnerPicks.length >= PICKS_TO_WIN) {
    const loserId = otherPlayer(row, winnerId);
    const remaining = row.character_ids.slice(row.round + 1).map((id) => ({ characterId: id, price: 0 }));
    const loserPicks = [...picksOf(row, loserId), ...remaining];
    fields[picksField(row, loserId)] = loserPicks;
    fields.round = row.character_ids.length;
    fields.turn = null;
    fields.status = "finished";

    const xPicks = winnerId === row.player_x ? winnerPicks : loserPicks;
    const oPicks = winnerId === row.player_o ? winnerPicks : loserPicks;
    const xPower = totalPower(xPicks);
    const oPower = totalPower(oPicks);

    if (xPower === oPower) {
      fields.result = "draw";
      fields.winner = null;
    } else {
      fields.result = "win";
      fields.winner = xPower > oPower ? row.player_x : row.player_o;
    }
  } else {
    fields.round = row.round + 1;
    fields.turn = starterFor(row, row.round + 1);
  }

  return updateDraftGame(db, row.id, fields);
}

export async function toClientDraftGame(db: SupabaseClient, game: DraftGameRow): Promise<DraftGame> {
  const { data: players } = await db.from("users").select("id, username").in("id", [game.player_x, game.player_o]);
  const byId = new Map((players ?? []).map((p) => [p.id as string, p.username as string]));

  return {
    id: game.id,
    playerX: { id: game.player_x, username: byId.get(game.player_x) ?? "Unknown" },
    playerO: { id: game.player_o, username: byId.get(game.player_o) ?? "Unknown" },
    status: game.status,
    characterIds: game.character_ids,
    round: game.round,
    turn: game.turn,
    currentBid: game.current_bid,
    currentBidder: game.current_bidder,
    budgets: { x: game.budget_x, o: game.budget_o },
    picks: { x: game.picks_x, o: game.picks_o },
    winner: game.winner,
    result: game.result,
    createdAt: game.created_at,
    updatedAt: game.updated_at,
  };
}
