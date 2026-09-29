import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DRAFT_CHARACTERS } from "@/data/draft-characters";
import { CARDS_PER_PACK, PACKS, rarityOf, rarityWeightFor } from "@/lib/album-data";
import type { AlbumCollection, AlbumPackType, AlbumPull, AlbumState } from "@/lib/types";

/**
 * Weighted random draw of CARDS_PER_PACK cards - duplicates within a pack are allowed, matching
 * real trading-card-pack behaviour where the same card can appear twice.
 */
function drawPack(packType: AlbumPackType): string[] {
  const pool = DRAFT_CHARACTERS.map((c) => ({ id: c.id, weight: rarityWeightFor(packType, rarityOf(c.id)) }));
  const total = pool.reduce((sum, c) => sum + c.weight, 0);
  const picked: string[] = [];
  for (let i = 0; i < CARDS_PER_PACK; i++) {
    let r = Math.random() * total;
    let idx = pool.length - 1;
    for (let j = 0; j < pool.length; j++) {
      r -= pool[j].weight;
      if (r <= 0) { idx = j; break; }
    }
    picked.push(pool[idx].id);
  }
  return picked;
}

export async function getAlbumState(db: SupabaseClient, userId: string): Promise<AlbumState> {
  const [{ data: userRow }, { data: cardRows }] = await Promise.all([
    db.from("users").select("vibranium").eq("id", userId).maybeSingle(),
    db.from("album_cards").select("character_id, count").eq("user_id", userId),
  ]);
  const cards: AlbumCollection = {};
  for (const row of cardRows ?? []) cards[row.character_id as string] = row.count as number;
  return { vibranium: userRow?.vibranium ?? 0, cards };
}

/**
 * Spends a pack's cost and grants CARDS_PER_PACK random cards in a single database round trip:
 * open_pack does the balance check, the deduction, and the card grants as one atomic statement,
 * and hands back the resulting balance too, so there's no separate follow-up read.
 */
export async function openPack(
  db: SupabaseClient,
  userId: string,
  packType: AlbumPackType,
): Promise<{ vibranium: number; pulls: AlbumPull[] } | { error: string }> {
  const pack = PACKS[packType];
  if (!pack) return { error: "Invalid pack." };

  const characterIds = drawPack(packType);
  const { data, error } = await db.rpc("open_pack", {
    p_user_id: userId,
    p_amount: pack.cost,
    p_character_ids: characterIds,
  });
  if (error) {
    if (error.message?.includes("insufficient_vibranium")) return { error: "Not enough vibraniums." };
    return { error: "Couldn't open the pack." };
  }
  if (!data) return { error: "Couldn't open the pack." };

  const result = data as { vibranium: number; pulls: { character_id: string; is_new: boolean }[] };
  const pulls: AlbumPull[] = result.pulls.map((p) => ({ characterId: p.character_id, isNew: p.is_new }));
  return { vibranium: result.vibranium, pulls };
}
