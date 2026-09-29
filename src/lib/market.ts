import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AlbumCollection, MarketListing, MarketListingStatus } from "@/lib/types";

export interface MarketListingRow {
  id: string;
  seller_id: string;
  character_id: string;
  price: number;
  status: MarketListingStatus;
  buyer_id: string | null;
  created_at: string;
}

const LISTING_COLUMNS = "id, seller_id, character_id, price, status, buyer_id, created_at";

export interface MarketState {
  vibranium: number;
  cards: AlbumCollection;
  listings: MarketListing[];
  myListings: MarketListing[];
}

export async function getMarketState(db: SupabaseClient, userId: string): Promise<MarketState> {
  const [{ data: userRow }, { data: cardRows }, { data: openListings }, { data: myListings }] = await Promise.all([
    db.from("users").select("vibranium").eq("id", userId).maybeSingle(),
    db.from("album_cards").select("character_id, count").eq("user_id", userId),
    db.from("market_listings").select(LISTING_COLUMNS).eq("status", "open").order("created_at", { ascending: false }),
    db.from("market_listings").select(LISTING_COLUMNS).eq("seller_id", userId).order("created_at", { ascending: false }).limit(20),
  ]);

  const cards: AlbumCollection = {};
  for (const row of cardRows ?? []) cards[row.character_id as string] = row.count as number;

  const sellerIds = Array.from(new Set([userId, ...((openListings ?? []) as MarketListingRow[]).map((l) => l.seller_id)]));
  const { data: sellers } = await db.from("users").select("id, username").in("id", sellerIds);
  const usernameById = new Map((sellers ?? []).map((u) => [u.id as string, u.username as string]));

  const toListing = (row: MarketListingRow): MarketListing => ({
    id: row.id,
    characterId: row.character_id,
    price: row.price,
    seller: { id: row.seller_id, username: usernameById.get(row.seller_id) ?? "Unknown" },
    status: row.status,
    createdAt: row.created_at,
  });

  return {
    vibranium: userRow?.vibranium ?? 0,
    cards,
    listings: ((openListings ?? []) as MarketListingRow[]).map(toListing),
    myListings: ((myListings ?? []) as MarketListingRow[]).map(toListing),
  };
}

export async function createListing(
  db: SupabaseClient,
  sellerId: string,
  characterId: string,
  price: number,
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await db.rpc("create_market_listing", {
    p_seller_id: sellerId,
    p_character_id: characterId,
    p_price: price,
  });
  if (error) {
    if (error.message?.includes("no_duplicate")) return { error: "You don't have a spare copy of that character to sell." };
    return { error: "Couldn't create the listing." };
  }
  return { id: data as string };
}

export async function cancelListing(db: SupabaseClient, listingId: string, sellerId: string): Promise<boolean> {
  const { data, error } = await db.rpc("cancel_market_listing", { p_listing_id: listingId, p_seller_id: sellerId });
  if (error) return false;
  return data === true;
}

export async function buyListing(
  db: SupabaseClient,
  listingId: string,
  buyerId: string,
): Promise<{ vibranium: number } | { error: string }> {
  const { data, error } = await db.rpc("buy_market_listing", { p_listing_id: listingId, p_buyer_id: buyerId });
  if (error) {
    if (error.message?.includes("insufficient_vibranium")) return { error: "Not enough vibraniums." };
    if (error.message?.includes("listing_unavailable")) return { error: "That listing isn't available anymore." };
    return { error: "Couldn't complete the purchase." };
  }
  const result = data as { vibranium: number };
  return { vibranium: result.vibranium };
}
