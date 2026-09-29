import { NextResponse } from "next/server";
import { ROOM_COLUMNS, toClientTradeRoom, type TradeRoomRow } from "@/lib/trade";
import { guard } from "@/lib/session";
import { admin } from "@/lib/supabase/admin";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (!g.ok) return g.response;
  const db = admin();
  if (!db) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const { id } = await params;
  const { userId } = g.session;

  const { data: existingRooms, error: existingError } = await db
    .from("trade_rooms")
    .select("host_id, guest_id")
    .in("status", ["open", "active"]);
  if (existingError) return NextResponse.json({ error: "Couldn't join that room." }, { status: 500 });
  const busy = existingRooms.some((r) => r.host_id === userId || r.guest_id === userId);
  if (busy) return NextResponse.json({ error: "You're already in a changing room. Leave it before joining another." }, { status: 409 });

  const { data, error } = await db
    .from("trade_rooms")
    .update({ guest_id: userId, status: "active" })
    .eq("id", id)
    .eq("status", "open")
    .is("guest_id", null)
    .neq("host_id", userId)
    .select(ROOM_COLUMNS)
    .single();
  if (error || !data) return NextResponse.json({ error: "That room isn't available to join." }, { status: 409 });

  const room = await toClientTradeRoom(db, data as TradeRoomRow);
  return NextResponse.json({ room });
}
