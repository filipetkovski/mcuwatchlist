import { NextResponse, type NextRequest } from "next/server";
import { DRAFT_GAME_COLUMNS, PICKS_TO_WIN, applyBid, applyLineup, applyPass, toClientDraftGame, validateBid, type DraftGameRow } from "@/lib/draft";
import { guard } from "@/lib/session";
import { admin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (!g.ok) return g.response;
  const db = admin();
  if (!db) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const { id } = await params;
  const { userId } = g.session;
  const body = (await req.json().catch(() => null)) as { action?: unknown; amount?: unknown; lineup?: unknown } | null;
  const action = body?.action;
  if (action !== "bid" && action !== "pass" && action !== "lineup") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { data, error } = await db.from("draft_games").select(DRAFT_GAME_COLUMNS).eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: "Couldn't load game." }, { status: 500 });
  const row = data as DraftGameRow | null;
  if (!row) return NextResponse.json({ error: "Game not found." }, { status: 404 });
  if (row.player_x !== userId && row.player_o !== userId) {
    return NextResponse.json({ error: "Not your game." }, { status: 403 });
  }

  if (action === "lineup") {
    if (row.status !== "lineup") return NextResponse.json({ error: "This draft isn't in the lineup phase." }, { status: 409 });

    const rawLineup = body?.lineup;
    if (!Array.isArray(rawLineup) || rawLineup.length !== PICKS_TO_WIN) {
      return NextResponse.json({ error: "Invalid lineup." }, { status: 400 });
    }
    const lineup = rawLineup as unknown[];
    const playerPicks = userId === row.player_x ? row.picks_x : row.picks_o;
    const validIds = new Set(playerPicks.map((p) => p.characterId));
    if (!lineup.every((id) => typeof id === "string" && validIds.has(id as string)) || new Set(lineup).size !== PICKS_TO_WIN) {
      return NextResponse.json({ error: "Invalid lineup." }, { status: 400 });
    }
    const alreadySubmitted = userId === row.player_x ? row.lineup_x !== null : row.lineup_o !== null;
    if (alreadySubmitted) return NextResponse.json({ error: "You've already submitted your lineup." }, { status: 409 });

    const updated = await applyLineup(db, row, userId, lineup as string[]);
    if (!updated) return NextResponse.json({ error: "Couldn't save your lineup." }, { status: 500 });

    if (updated.status === "finished") {
      if (updated.result === "win" && updated.winner) {
        const loserId = updated.winner === updated.player_x ? updated.player_o : updated.player_x;
        await db.rpc("adjust_vibranium", { p_user_id: updated.winner, p_delta: 100 });
        await db.rpc("adjust_vibranium", { p_user_id: loserId, p_delta: -50 });
      } else if (updated.result === "draw") {
        await db.rpc("adjust_vibranium", { p_user_id: updated.player_x, p_delta: -10 });
        await db.rpc("adjust_vibranium", { p_user_id: updated.player_o, p_delta: -10 });
      }
    }

    return NextResponse.json({ game: await toClientDraftGame(db, updated, userId) });
  }

  if (row.status !== "active") return NextResponse.json({ error: "This draft isn't active." }, { status: 409 });
  if (row.turn !== userId) return NextResponse.json({ error: "It's not your turn." }, { status: 409 });

  if (action === "bid") {
    const amount = body?.amount;
    if (typeof amount !== "number" || !Number.isInteger(amount)) {
      return NextResponse.json({ error: "Invalid bid." }, { status: 400 });
    }
    const bidError = validateBid(row, userId, amount);
    if (bidError) return NextResponse.json({ error: bidError }, { status: 400 });
    const updated = await applyBid(db, row, userId, amount);
    if (!updated) return NextResponse.json({ error: "Couldn't place your bid." }, { status: 500 });
    return NextResponse.json({ game: await toClientDraftGame(db, updated, userId) });
  }

  if (row.current_bidder === null) {
    return NextResponse.json({ error: "You have to make the opening bid." }, { status: 400 });
  }
  const updated = await applyPass(db, row);
  if (!updated) return NextResponse.json({ error: "Couldn't save that." }, { status: 500 });

  return NextResponse.json({ game: await toClientDraftGame(db, updated, userId) });
}
