import { NextResponse, type NextRequest } from "next/server";
import { guard } from "@/lib/session";
import { admin } from "@/lib/supabase/admin";
import type { LeaderboardEntry } from "@/lib/types";

export async function GET() {
  const g = await guard();
  if (!g.ok) return g.response;
  const db = admin();
  if (!db) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const { userId } = g.session;

  const [
    { data: users, error: usersError },
    { data: games, error: gamesError },
    { data: allFinishedGames, error: allGamesError },
  ] = await Promise.all([
    db.from("users").select("id, username, role, vibranium, draft_joined").order("username", { ascending: true }),
    db
      .from("draft_games")
      .select("id, player_x, player_o, status, turn, lineup_x, lineup_o, winner, result, created_at")
      .or(`player_x.eq.${userId},player_o.eq.${userId}`)
      .order("created_at", { ascending: false }),
    // Every finished draft game system-wide, so the leaderboard shows each player's overall record.
    db.from("draft_games").select("player_x, player_o, winner, result").eq("status", "finished"),
  ]);
  if (usersError) return NextResponse.json({ error: "Couldn't load players." }, { status: 500 });
  if (gamesError) return NextResponse.json({ error: "Couldn't load games." }, { status: 500 });
  if (allGamesError) return NextResponse.json({ error: "Couldn't load games." }, { status: 500 });

  const usernameById = new Map(users.map((u) => [u.id as string, u.username as string]));
  const opponentOf = (game: (typeof games)[number]) => (game.player_x === userId ? game.player_o : game.player_x);
  const me = users.find((u) => u.id === userId);
  const visibleUsers = users
    .filter((u) => u.draft_joined)
    .filter((u) => g.session.role === "admin" || u.role !== "admin");

  const incomingInvites = games
    .filter((game) => game.status === "pending" && game.player_o === userId)
    .map((game) => ({ id: game.id, opponent: { id: game.player_x, username: usernameById.get(game.player_x) ?? "Unknown" } }));

  const outgoingInvites = games
    .filter((game) => game.status === "pending" && game.player_x === userId)
    .map((game) => ({ id: game.id, opponent: { id: game.player_o, username: usernameById.get(game.player_o) ?? "Unknown" } }));

  const activeGames = games
    .filter((game) => game.status === "active" || game.status === "lineup")
    .map((game) => {
      const opponentId = opponentOf(game);
      const yourTurn =
        game.status === "active"
          ? game.turn === userId
          : game.player_x === userId ? game.lineup_x === null : game.lineup_o === null;
      return {
        id: game.id,
        opponent: { id: opponentId, username: usernameById.get(opponentId) ?? "Unknown" },
        yourTurn,
      };
    });

  const finishedGames = games
    .filter((game) => game.status === "finished")
    .slice(0, 10)
    .map((game) => {
      const opponentId = opponentOf(game);
      const outcome: "win" | "loss" | "draw" =
        game.result === "draw" ? "draw" : game.winner === userId ? "win" : "loss";
      return { id: game.id, opponent: { id: opponentId, username: usernameById.get(opponentId) ?? "Unknown" }, outcome };
    });

  const record = new Map<string, { wins: number; losses: number; draws: number }>();
  const bump = (id: string, key: "wins" | "losses" | "draws") => {
    const entry = record.get(id) ?? { wins: 0, losses: 0, draws: 0 };
    entry[key] += 1;
    record.set(id, entry);
  };
  for (const game of allFinishedGames) {
    if (game.result === "draw") {
      bump(game.player_x, "draws");
      bump(game.player_o, "draws");
    } else if (game.winner) {
      bump(game.winner, "wins");
      bump(game.winner === game.player_x ? game.player_o : game.player_x, "losses");
    }
  }

  const leaderboard: LeaderboardEntry[] = visibleUsers
    .map((u) => {
      const rec = record.get(u.id) ?? { wins: 0, losses: 0, draws: 0 };
      return { id: u.id, username: u.username, vibranium: u.vibranium, ...rec };
    })
    .sort((a, b) => b.vibranium - a.vibranium);

  const opponents = visibleUsers.filter((u) => u.id !== userId).map((u) => ({ id: u.id, username: u.username }));

  return NextResponse.json({
    joined: me?.draft_joined === true,
    opponents,
    incomingInvites,
    outgoingInvites,
    activeGames,
    finishedGames,
    leaderboard,
  });
}

export async function POST(req: NextRequest) {
  const g = await guard();
  if (!g.ok) return g.response;
  const db = admin();
  if (!db) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const { userId } = g.session;
  const body = (await req.json().catch(() => null)) as { opponentId?: unknown } | null;
  const opponentId = typeof body?.opponentId === "string" ? body.opponentId : "";
  if (!opponentId || opponentId === userId) {
    return NextResponse.json({ error: "Invalid opponent." }, { status: 400 });
  }

  const { data: participants, error: participantsError } = await db
    .from("users")
    .select("id, draft_joined")
    .in("id", [userId, opponentId]);
  if (participantsError) return NextResponse.json({ error: "Couldn't send invite." }, { status: 500 });
  const opponent = participants?.find((p) => p.id === opponentId);
  const self = participants?.find((p) => p.id === userId);
  if (!opponent) return NextResponse.json({ error: "That player doesn't exist." }, { status: 404 });
  if (!self?.draft_joined) return NextResponse.json({ error: "Join Draft before challenging someone." }, { status: 403 });
  if (!opponent.draft_joined) return NextResponse.json({ error: "That player hasn't joined Draft yet." }, { status: 400 });

  const { data: existingGames, error: existingError } = await db
    .from("draft_games")
    .select("player_x, player_o")
    .in("status", ["pending", "active", "lineup"]);
  if (existingError) return NextResponse.json({ error: "Couldn't send invite." }, { status: 500 });
  const busy = (id: string) => existingGames.some((game) => game.player_x === id || game.player_o === id);
  if (busy(userId)) {
    return NextResponse.json({ error: "You already have a draft in progress. Finish it before starting another." }, { status: 409 });
  }
  if (busy(opponentId)) {
    return NextResponse.json({ error: "That player already has a draft in progress." }, { status: 409 });
  }

  const { data, error } = await db
    .from("draft_games")
    .insert({ player_x: userId, player_o: opponentId, status: "pending" })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: "Couldn't send invite." }, { status: 500 });

  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}
