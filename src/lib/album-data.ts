import { DRAFT_CHARACTERS } from "@/data/draft-characters";
import type { AlbumPackType, AlbumRarity } from "@/lib/types";

export const CARDS_PER_PACK = 5;

export const PACKS: Record<AlbumPackType, { label: string; cost: number }> = {
  silver: { label: "Silver Pack", cost: 150 },
  gold: { label: "Gold Pack", cost: 400 },
  platinum: { label: "Platinum Pack", cost: 1000 },
};

/**
 * Rarity tiers ranked by power (strongest characters are rarest): the top ~5% of characters are
 * Legendary and only carry a 5% pull weight each, down to the weakest ~50% being Common at a 75%
 * pull weight each. Weights are relative, not literal percentages - within a pack, a character's
 * chance of being drawn is its weight divided by the total remaining weight in the pool.
 */
export const RARITY_TIERS: { rarity: AlbumRarity; share: number; weight: number; label: string }[] = [
  { rarity: "legendary", share: 0.05, weight: 5, label: "Legendary" },
  { rarity: "rare", share: 0.2, weight: 25, label: "Rare" },
  { rarity: "uncommon", share: 0.25, weight: 50, label: "Uncommon" },
  { rarity: "common", share: 0.5, weight: 75, label: "Common" },
];

function buildRarityMap(): Map<string, AlbumRarity> {
  const sorted = [...DRAFT_CHARACTERS].sort((a, b) => b.power - a.power);
  const map = new Map<string, AlbumRarity>();
  let start = 0;
  for (const tier of RARITY_TIERS) {
    const count = Math.round(tier.share * DRAFT_CHARACTERS.length);
    for (let i = start; i < Math.min(start + count, sorted.length); i++) map.set(sorted[i].id, tier.rarity);
    start += count;
  }
  // Rounding each tier independently can leave a straggler or two off the end - default those to
  // Common so every character always resolves to a tier.
  for (const c of DRAFT_CHARACTERS) if (!map.has(c.id)) map.set(c.id, "common");
  return map;
}

let rarityMap: Map<string, AlbumRarity> | null = null;

export function rarityOf(characterId: string): AlbumRarity {
  rarityMap ??= buildRarityMap();
  return rarityMap.get(characterId) ?? "common";
}

function tier(rarity: AlbumRarity) {
  return RARITY_TIERS.find((t) => t.rarity === rarity)!;
}

export function rarityWeight(rarity: AlbumRarity): number {
  return tier(rarity).weight;
}

export function rarityLabel(rarity: AlbumRarity): string {
  return tier(rarity).label;
}
