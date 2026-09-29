import { NextResponse, type NextRequest } from "next/server";
import { ROOM_COLUMNS, applyOffer, toClientTradeRoom, type TradeRoomRow } from "@/lib/trade";
import { guard } from "@/lib/session";
import { admin } from "@/lib/supabase/admin";

const MAX_OFFER_SIZE = 20;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (!g.ok) return g.response;
  const db = admin();
  if (!db) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const { id } = await params;
  const { userId } = g.session;

  const body = (await req.json().catch(() => null)) as { characterIds?: unknown } | null;
  const characterIds = body?.characterIds;
  if (!Array.isArray(characterIds) || characterIds.length > MAX_OFFER_SIZE || !characterIds.every((c) => typeof c === "string")) {
    return NextResponse.json({ error: "Invalid offer." }, { status: 400 });
  }

  const { data, error } = await db.from("trade_rooms").select(ROOM_COLUMNS).eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: "Couldn't load that room." }, { status: 500 });
  const row = data as TradeRoomRow | null;
  if (!row) return NextResponse.json({ error: "Room not found." }, { status: 404 });

  const result = await applyOffer(db, row, userId, characterIds as string[]);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

  const room = await toClientTradeRoom(db, result);
  return NextResponse.json({ room });
}
