import type { PathId, ScopeId, Title } from "@/lib/types";

export const DOOMSDAY_RELEASE = "2026-12-18";

export interface PathDef {
  id: PathId;
  slug: PathId;
  name: string;
  tagline: string;
  description: string;
  include: (t: Title) => boolean;
}

export const PATHS: PathDef[] = [
  {
    id: "new-to-marvel",
    slug: "new-to-marvel",
    name: "New to Marvel",
    tagline: "Start from zero, skip nothing.",
    description:
      "Every film, series and special from Marvel Studios in one continuous run. The full journey, in the order you pick.",
    include: (t) => t.universe === "mcu",
  },
  {
    id: "prepare-for-doomsday",
    slug: "prepare-for-doomsday",
    name: "Prepare for Doomsday",
    tagline: "Only what feeds the next big crossover.",
    description:
      "A tight list of essential and recommended titles that set up Avengers: Doomsday, based on announced casting and story threads.",
    include: (t) =>
      t.universe === "mcu" &&
      t.leads_into_doomsday &&
      (t.importance === "essential" || t.importance === "recommended"),
  },
  {
    id: "rewatch-essentials",
    slug: "rewatch-essentials",
    name: "Rewatch the Essentials",
    tagline: "The best-of reel for returning fans.",
    description:
      "A curated highlight run of the core saga: the titles that carry the biggest character and story beats.",
    include: (t) => t.universe === "mcu" && t.importance === "essential",
  },
];

export const SCOPE_LABELS: Record<ScopeId, string> = {
  "new-to-marvel": "All MCU titles",
  "prepare-for-doomsday": "Prepare for Doomsday",
  "rewatch-essentials": "Rewatch the Essentials",
};

export const SCOPE_IDS = Object.keys(SCOPE_LABELS) as ScopeId[];

export function getPath(slug: string): PathDef | undefined {
  return PATHS.find((p) => p.slug === slug);
}

export function titlesForScope(titles: Title[], scope: ScopeId): Title[] {
  const path = PATHS.find((p) => p.id === scope);
  return path ? titles.filter(path.include) : titles;
}
