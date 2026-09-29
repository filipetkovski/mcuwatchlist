import { DRAFT_CHARACTERS } from "@/data/draft-characters";
import type { AlbumPackType, AlbumRarity } from "@/lib/types";

export const CARDS_PER_PACK = 5;

export const PACKS: Record<AlbumPackType, { label: string; cost: number }> = {
  silver: { label: "Silver Pack", cost: 150 },
  gold: { label: "Gold Pack", cost: 400 },
  platinum: { label: "Platinum Pack", cost: 1000 },
};

/**
 * Rarity tiers ranked by power. Weights are deliberately extreme so commons dominate Silver pulls
 * (~91% of draws), making uncommons/rares/legendaries genuinely hard to find. Gold and Platinum
 * packs heavily multiply the rarer tiers so they feel meaningfully better.
 */
export const RARITY_TIERS: { rarity: AlbumRarity; share: number; weight: number; label: string }[] = [
  { rarity: "legendary", share: 0.05, weight: 1, label: "Legendary" },
  { rarity: "rare", share: 0.2, weight: 5, label: "Rare" },
  { rarity: "uncommon", share: 0.25, weight: 15, label: "Uncommon" },
  { rarity: "common", share: 0.5, weight: 100, label: "Common" },
];

const PACK_WEIGHT_MULTIPLIERS: Record<AlbumPackType, Record<AlbumRarity, number>> = {
  silver:   { legendary: 1,  rare: 1,  uncommon: 1,   common: 1   },
  gold:     { legendary: 8,  rare: 4,  uncommon: 2,   common: 0.6 },
  platinum: { legendary: 20, rare: 8,  uncommon: 3,   common: 0.3 },
};

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

/** The pull weight for a rarity within a specific pack type - see PACK_WEIGHT_MULTIPLIERS. */
export function rarityWeightFor(packType: AlbumPackType, rarity: AlbumRarity): number {
  return tier(rarity).weight * PACK_WEIGHT_MULTIPLIERS[packType][rarity];
}

export function rarityLabel(rarity: AlbumRarity): string {
  return tier(rarity).label;
}
