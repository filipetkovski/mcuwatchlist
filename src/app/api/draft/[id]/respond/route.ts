import { NextResponse, type NextRequest } from "next/server";
import { DRAFT_GAME_COLUMNS, STARTING_BUDGET, pickCharacterIds, toClientDraftGame, type DraftGameRow } from "@/lib/draft";
import { guard } from "@/lib/session";
import { admin } from "@/lib/supabase/admin";
import { emitDraftUpdate } from "@/lib/socket-server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (!g.ok) return g.response;
  const db = admin();
  if (!db) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { accept?: unknown } | null;
  if (typeof body?.accept !== "boolean") return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const { data, error } = await db.from("draft_games").select(DRAFT_GAME_COLUMNS).eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: "Couldn't load game." }, { status: 500 });
  const row = data as DraftGameRow | null;
  if (!row) return NextResponse.json({ error: "Game not found." }, { status: 404 });
  if (row.player_o !== g.session.userId) return NextResponse.json({ error: "Not your invite." }, { status: 403 });
  if (row.status !== "pending") return NextResponse.json({ error: "This invite was already answered." }, { status: 409 });

  if (!body.accept) {
    const { data: declined, error: declineError } = await db
      .from("draft_games")
      .update({ status: "declined" })
      .eq("id", id)
      .select(DRAFT_GAME_COLUMNS)
      .single();
    if (declineError || !declined) return NextResponse.json({ error: "Couldn't decline." }, { status: 500 });
    const d = declined as DraftGameRow;
    const [xState, oState] = await Promise.all([
      toClientDraftGame(db, d, d.player_x),
      toClientDraftGame(db, d, d.player_o),
    ]);
    emitDraftUpdate(id, d.player_x, d.player_o, xState, oState);
    return NextResponse.json({ game: g.session.userId === d.player_x ? xState : oState });
  }

  const { data: existingGames, error: existingError } = await db
    .from("draft_games")
    .select("id, player_x, player_o")
    .in("status", ["active", "lineup"])
    .neq("id", id);
  if (existingError) return NextResponse.json({ error: "Couldn't start the draft." }, { status: 500 });
  const busy = (playerId: string) => existingGames.some((game) => game.player_x === playerId || game.player_o === playerId);
  if (busy(row.player_x) || busy(row.player_o)) {
    return NextResponse.json({ error: "One of you already has a draft in progress. Finish it first." }, { status: 409 });
  }

  const firstBidder = Math.random() < 0.5 ? row.player_x : row.player_o;
  const { data: started, error: startError } = await db
    .from("draft_games")
    .update({
      status: "active",
      character_ids: pickCharacterIds(),
      round: 0,
      first_bidder: firstBidder,
      turn: firstBidder,
      current_bid: 0,
      current_bidder: null,
      budget_x: STARTING_BUDGET,
      budget_o: STARTING_BUDGET,
      picks_x: [],
      picks_o: [],
    })
    .eq("id", id)
    .select(DRAFT_GAME_COLUMNS)
    .single();
  if (startError || !started) return NextResponse.json({ error: "Couldn't start the draft." }, { status: 500 });
  const s = started as DraftGameRow;
  const [xState, oState] = await Promise.all([
    toClientDraftGame(db, s, s.player_x),
    toClientDraftGame(db, s, s.player_o),
  ]);
  emitDraftUpdate(id, s.player_x, s.player_o, xState, oState);
  return NextResponse.json({ game: g.session.userId === s.player_x ? xState : oState });
}
