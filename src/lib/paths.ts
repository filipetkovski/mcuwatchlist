import { isXMenTitle } from "@/lib/titles";
import type { PathId, ScopeId, Title } from "@/lib/types";

export const DOOMSDAY_RELEASE = "2026-12-18";

/**
 * All three built-in paths are views over the same title catalog, so a title's watched state is
 * shared across them - this is the progress key used for all of them, regardless of which path is
 * active. Saved schedules (created in the planner) keep their own progress, keyed by schedule id.
 */
export const SHARED_PROGRESS_KEY = "titles";

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
      "Every film, series and special in one continuous run - Marvel Studios plus the pre-MCU Spider-Man and X-Men films. The full journey, in the order you pick.",
    include: () => true,
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
    name: "The Essentials",
    tagline: "The best-of reel for returning fans.",
    description:
      "A curated highlight run of the core saga: the titles that carry the biggest character and story beats.",
    include: (t) => t.universe === "mcu" && t.importance === "essential",
  },
];

export const SCOPE_LABELS: Record<ScopeId, string> = {
  "new-to-marvel": "All titles",
  "mcu-only": "MCU only",
  "xmen-only": "X-Men only",
  "prepare-for-doomsday": "Prepare for Doomsday",
  "rewatch-essentials": "Rewatch the Essentials",
};

export const SCOPE_IDS = Object.keys(SCOPE_LABELS) as ScopeId[];

export function getPath(slug: string): PathDef | undefined {
  return PATHS.find((p) => p.slug === slug);
}

export function titlesForScope(titles: Title[], scope: ScopeId): Title[] {
  if (scope === "mcu-only") return titles.filter((t) => t.universe === "mcu");
  if (scope === "xmen-only") return titles.filter(isXMenTitle);
  const path = PATHS.find((p) => p.id === scope);
  return path ? titles.filter(path.include) : titles;
}
