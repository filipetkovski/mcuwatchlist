import { NextResponse } from "next/server";
import { ROOM_COLUMNS, leaveRoom, toClientTradeRoom, type TradeRoomRow } from "@/lib/trade";
import { guard } from "@/lib/session";
import { admin } from "@/lib/supabase/admin";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (!g.ok) return g.response;
  const db = admin();
  if (!db) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const { id } = await params;
  const { userId } = g.session;

  const { data, error } = await db.from("trade_rooms").select(ROOM_COLUMNS).eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: "Couldn't load that room." }, { status: 500 });
  const row = data as TradeRoomRow | null;
  if (!row) return NextResponse.json({ error: "Room not found." }, { status: 404 });
  if (row.host_id !== userId && row.guest_id !== userId) return NextResponse.json({ error: "Not your room." }, { status: 403 });

  const room = await toClientTradeRoom(db, row);
  return NextResponse.json({ room });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (!g.ok) return g.response;
  const db = admin();
  if (!db) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const { id } = await params;
  const { userId } = g.session;

  const { data, error } = await db.from("trade_rooms").select(ROOM_COLUMNS).eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: "Couldn't load that room." }, { status: 500 });
  const row = data as TradeRoomRow | null;
  if (!row) return NextResponse.json({ error: "Room not found." }, { status: 404 });

  const ok = await leaveRoom(db, row, userId);
  if (!ok) return NextResponse.json({ error: "Not your room." }, { status: 403 });
  return NextResponse.json({ ok: true });
}
