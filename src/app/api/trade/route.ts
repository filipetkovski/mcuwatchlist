import { NextResponse } from "next/server";
import { ROOM_COLUMNS, type TradeRoomRow } from "@/lib/trade";
import { guard } from "@/lib/session";
import { admin } from "@/lib/supabase/admin";
import type { TradeRoomSummary } from "@/lib/types";

export async function GET() {
  const g = await guard();
  if (!g.ok) return g.response;
  const db = admin();
  if (!db) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const { userId } = g.session;

  const { data: rooms, error } = await db
    .from("trade_rooms")
    .select(ROOM_COLUMNS)
    .in("status", ["open", "active"])
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Couldn't load the trade lobby." }, { status: 500 });

  const rows = rooms as TradeRoomRow[];
  const myRoom = rows.find((r) => r.host_id === userId || r.guest_id === userId) ?? null;

  const openRooms = rows.filter((r) => r.status === "open" && r.host_id !== userId);
  const hostIds = Array.from(new Set(openRooms.map((r) => r.host_id)));
  const { data: hosts } = hostIds.length > 0 ? await db.from("users").select("id, username").in("id", hostIds) : { data: [] };
  const usernameById = new Map((hosts ?? []).map((u) => [u.id as string, u.username as string]));

  const summaries: TradeRoomSummary[] = openRooms.map((r) => ({
    id: r.id,
    host: { id: r.host_id, username: usernameById.get(r.host_id) ?? "Unknown" },
    createdAt: r.created_at,
  }));

  return NextResponse.json({ myRoomId: myRoom?.id ?? null, openRooms: summaries });
}

export async function POST() {
  const g = await guard();
  if (!g.ok) return g.response;
  const db = admin();
  if (!db) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const { userId } = g.session;

  const { data: existingRooms, error: existingError } = await db
    .from("trade_rooms")
    .select("host_id, guest_id")
    .in("status", ["open", "active"]);
  if (existingError) return NextResponse.json({ error: "Couldn't create a room." }, { status: 500 });
  const busy = existingRooms.some((r) => r.host_id === userId || r.guest_id === userId);
  if (busy) return NextResponse.json({ error: "You're already in a changing room. Leave it before starting another." }, { status: 409 });

  const { data, error } = await db.from("trade_rooms").insert({ host_id: userId }).select("id").single();
  if (error) return NextResponse.json({ error: "Couldn't create a room." }, { status: 500 });

  return NextResponse.json({ id: data.id }, { status: 201 });
}
