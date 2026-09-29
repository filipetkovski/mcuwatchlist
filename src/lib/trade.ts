import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TradeRoom, TradeRoomStatus } from "@/lib/types";

export interface TradeRoomRow {
  id: string;
  host_id: string;
  guest_id: string | null;
  status: TradeRoomStatus;
  host_offer: string[];
  guest_offer: string[];
  host_confirmed: boolean;
  guest_confirmed: boolean;
  created_at: string;
  updated_at: string;
}

export const ROOM_COLUMNS =
  "id, host_id, guest_id, status, host_offer, guest_offer, host_confirmed, guest_confirmed, created_at, updated_at";

async function updateRoom(db: SupabaseClient, roomId: string, fields: Record<string, unknown>): Promise<TradeRoomRow | null> {
  const { data, error } = await db.from("trade_rooms").update(fields).eq("id", roomId).select(ROOM_COLUMNS).single();
  if (error || !data) return null;
  return data as TradeRoomRow;
}

export async function toClientTradeRoom(db: SupabaseClient, row: TradeRoomRow): Promise<TradeRoom> {
  const ids = row.guest_id ? [row.host_id, row.guest_id] : [row.host_id];
  const { data: users } = await db.from("users").select("id, username").in("id", ids);
  const byId = new Map((users ?? []).map((u) => [u.id as string, u.username as string]));
  return {
    id: row.id,
    status: row.status,
    host: { id: row.host_id, username: byId.get(row.host_id) ?? "Unknown" },
    guest: row.guest_id ? { id: row.guest_id, username: byId.get(row.guest_id) ?? "Unknown" } : null,
    hostOffer: row.host_offer,
    guestOffer: row.guest_offer,
    hostConfirmed: row.host_confirmed,
    guestConfirmed: row.guest_confirmed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Replaces the caller's staged offer (a character id repeated once per copy offered) and resets
 * both sides' confirmations, since the terms just changed. Ownership is checked here for early
 * feedback; execute_trade re-checks it atomically when the trade actually goes through.
 */
export async function applyOffer(
  db: SupabaseClient,
  room: TradeRoomRow,
  userId: string,
  characterIds: string[],
): Promise<TradeRoomRow | { error: string }> {
  if (room.status !== "active") return { error: "This trade isn't active." };
  const isHost = userId === room.host_id;
  if (!isHost && userId !== room.guest_id) return { error: "Not your trade." };

  const counts = new Map<string, number>();
  for (const id of characterIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  if (counts.size > 0) {
    const { data: owned } = await db
      .from("album_cards")
      .select("character_id, count")
      .eq("user_id", userId)
      .in("character_id", Array.from(counts.keys()));
    const ownedMap = new Map((owned ?? []).map((r) => [r.character_id as string, r.count as number]));
    for (const [id, need] of counts) {
      if ((ownedMap.get(id) ?? 0) < need) return { error: "You don't own that many copies of one of those characters." };
    }
  }

  const offerField = isHost ? "host_offer" : "guest_offer";
  const updated = await updateRoom(db, room.id, { [offerField]: characterIds, host_confirmed: false, guest_confirmed: false });
  if (!updated) return { error: "Couldn't update your offer." };
  return updated;
}

/**
 * Sets the caller's confirmation. Once both sides are confirmed, executes the swap atomically; if
 * that fails (e.g. someone's offered card left their album in the meantime), the room is
 * cancelled instead of being left stuck.
 */
export async function applyConfirm(
  db: SupabaseClient,
  room: TradeRoomRow,
  userId: string,
  confirmed: boolean,
): Promise<TradeRoomRow | { error: string }> {
  if (room.status !== "active") return { error: "This trade isn't active." };
  const isHost = userId === room.host_id;
  if (!isHost && userId !== room.guest_id) return { error: "Not your trade." };

  const field = isHost ? "host_confirmed" : "guest_confirmed";
  let updated = await updateRoom(db, room.id, { [field]: confirmed });
  if (!updated) return { error: "Couldn't update your confirmation." };

  if (updated.host_confirmed && updated.guest_confirmed && updated.guest_id) {
    const { data: success, error } = await db.rpc("execute_trade", {
      p_room_id: room.id,
      p_host_id: updated.host_id,
      p_guest_id: updated.guest_id,
      p_host_offer: updated.host_offer,
      p_guest_offer: updated.guest_offer,
    });
    if (!error && success === true) {
      const { data: refreshed } = await db.from("trade_rooms").select(ROOM_COLUMNS).eq("id", room.id).single();
      if (refreshed) updated = refreshed as TradeRoomRow;
    } else {
      const cancelled = await updateRoom(db, room.id, { status: "cancelled" });
      if (cancelled) updated = cancelled;
    }
  }

  return updated;
}

/** Cancels the room if it hasn't completed yet; a finished/already-cancelled room is a no-op. */
export async function leaveRoom(db: SupabaseClient, room: TradeRoomRow, userId: string): Promise<boolean> {
  if (room.host_id !== userId && room.guest_id !== userId) return false;
  if (room.status === "open" || room.status === "active") {
    const { error } = await db.from("trade_rooms").update({ status: "cancelled" }).eq("id", room.id);
    return !error;
  }
  return true;
}
