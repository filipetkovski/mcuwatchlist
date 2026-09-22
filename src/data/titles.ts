import type { Importance, Title, TitleType, Universe } from "../lib/types";
import { POSTERS } from "./posters.ts";

// Curated catalog, listed in story (in-universe) order; story_order_index is derived from position.
// Importance and leads_into_doomsday are this project's own editorial calls based on publicly
// announced casting and story threads - not official Marvel guidance. TV runtimes are approximate
// season totals. Entries released or announced in 2026 are marked "unconfirmed" until verified.

interface Opts {
  universe?: Universe;
  leads?: boolean;
}

const rows: Array<
  [id: string, title: string, type: TitleType, release: string, minutes: number, importance: Importance, opts?: Opts]
> = [
  ["captain-america-the-first-avenger", "Captain America: The First Avenger", "movie", "2011-07-22", 124, "essential"],
  ["eyes-of-wakanda", "Eyes of Wakanda", "tv", "2025-08-27", 100, "optional"],
  ["captain-marvel", "Captain Marvel", "movie", "2019-03-08", 123, "recommended"],
  ["iron-man", "Iron Man", "movie", "2008-05-02", 126, "essential"],
  ["iron-man-2", "Iron Man 2", "movie", "2010-05-07", 124, "optional"],
  ["the-incredible-hulk", "The Incredible Hulk", "movie", "2008-06-13", 112, "optional"],
  ["thor", "Thor", "movie", "2011-05-06", 115, "recommended"],
  ["the-avengers", "The Avengers", "movie", "2012-05-04", 143, "essential"],
  ["thor-the-dark-world", "Thor: The Dark World", "movie", "2013-11-08", 112, "optional"],
  ["iron-man-3", "Iron Man 3", "movie", "2013-05-03", 130, "recommended"],
  ["captain-america-the-winter-soldier", "Captain America: The Winter Soldier", "movie", "2014-04-04", 136, "essential"],
  ["guardians-of-the-galaxy", "Guardians of the Galaxy", "movie", "2014-08-01", 121, "recommended"],
  ["guardians-of-the-galaxy-vol-2", "Guardians of the Galaxy Vol. 2", "movie", "2017-05-05", 136, "optional"],
  ["avengers-age-of-ultron", "Avengers: Age of Ultron", "movie", "2015-05-01", 141, "recommended"],
  ["ant-man", "Ant-Man", "movie", "2015-07-17", 117, "recommended"],
  ["captain-america-civil-war", "Captain America: Civil War", "movie", "2016-05-06", 147, "essential"],
  ["black-widow", "Black Widow", "movie", "2021-07-09", 134, "optional"],
  ["black-panther", "Black Panther", "movie", "2018-02-16", 134, "recommended"],
  ["spider-man-homecoming", "Spider-Man: Homecoming", "movie", "2017-07-07", 133, "recommended"],
  ["doctor-strange", "Doctor Strange", "movie", "2016-11-04", 115, "recommended"],
  ["thor-ragnarok", "Thor: Ragnarok", "movie", "2017-11-03", 130, "essential"],
  ["ant-man-and-the-wasp", "Ant-Man and the Wasp", "movie", "2018-07-06", 118, "optional"],
  ["avengers-infinity-war", "Avengers: Infinity War", "movie", "2018-04-27", 149, "essential"],
  ["avengers-endgame", "Avengers: Endgame", "movie", "2019-04-26", 181, "essential", { leads: true }],
  ["loki-s1", "Loki (Season 1)", "tv", "2021-06-09", 300, "essential", { leads: true }],
  ["wandavision", "WandaVision", "tv", "2021-01-15", 330, "recommended"],
  ["the-falcon-and-the-winter-soldier", "The Falcon and the Winter Soldier", "tv", "2021-03-19", 330, "recommended", { leads: true }],
  ["spider-man-far-from-home", "Spider-Man: Far From Home", "movie", "2019-07-02", 129, "recommended"],
  ["shang-chi", "Shang-Chi and the Legend of the Ten Rings", "movie", "2021-09-03", 132, "recommended", { leads: true }],
  ["eternals", "Eternals", "movie", "2021-11-05", 157, "optional"],
  ["hawkeye", "Hawkeye", "tv", "2021-11-24", 290, "optional"],
  ["spider-man-2002", "Spider-Man (2002)", "movie", "2002-05-03", 121, "optional", { universe: "non_marvel_studios" }],
  ["spider-man-2", "Spider-Man 2", "movie", "2004-06-30", 127, "optional", { universe: "non_marvel_studios" }],
  ["spider-man-3", "Spider-Man 3", "movie", "2007-05-04", 139, "optional", { universe: "non_marvel_studios" }],
  ["the-amazing-spider-man", "The Amazing Spider-Man", "movie", "2012-07-03", 136, "optional", { universe: "non_marvel_studios" }],
  ["the-amazing-spider-man-2", "The Amazing Spider-Man 2", "movie", "2014-05-02", 142, "optional", { universe: "non_marvel_studios" }],
  ["spider-man-no-way-home", "Spider-Man: No Way Home", "movie", "2021-12-17", 148, "essential", { leads: true }],
  ["doctor-strange-in-the-multiverse-of-madness", "Doctor Strange in the Multiverse of Madness", "movie", "2022-05-06", 126, "essential", { leads: true }],
  ["thor-love-and-thunder", "Thor: Love and Thunder", "movie", "2022-07-08", 119, "optional"],
  ["black-panther-wakanda-forever", "Black Panther: Wakanda Forever", "movie", "2022-11-11", 161, "recommended", { leads: true }],
  ["guardians-holiday-special", "The Guardians of the Galaxy Holiday Special", "special", "2022-11-25", 44, "optional"],
  ["ant-man-quantumania", "Ant-Man and the Wasp: Quantumania", "movie", "2023-02-17", 125, "recommended"],
  ["guardians-of-the-galaxy-vol-3", "Guardians of the Galaxy Vol. 3", "movie", "2023-05-05", 150, "recommended"],
  ["secret-invasion", "Secret Invasion", "tv", "2023-06-21", 270, "optional"],
  ["loki-s2", "Loki (Season 2)", "tv", "2023-10-06", 300, "recommended", { leads: true }],
  ["the-marvels", "The Marvels", "movie", "2023-11-10", 105, "optional"],
  ["x-men", "X-Men", "movie", "2000-07-14", 104, "optional", { universe: "non_marvel_studios" }],
  ["x2-x-men-united", "X2: X-Men United", "movie", "2003-05-02", 133, "optional", { universe: "non_marvel_studios" }],
  ["x-men-the-last-stand", "X-Men: The Last Stand", "movie", "2006-05-26", 104, "optional", { universe: "non_marvel_studios" }],
  ["x-men-origins-wolverine", "X-Men Origins: Wolverine", "movie", "2009-05-01", 107, "optional", { universe: "non_marvel_studios" }],
  ["x-men-first-class", "X-Men: First Class", "movie", "2011-06-03", 131, "optional", { universe: "non_marvel_studios" }],
  ["the-wolverine", "The Wolverine", "movie", "2013-07-26", 126, "optional", { universe: "non_marvel_studios" }],
  ["x-men-days-of-future-past", "X-Men: Days of Future Past", "movie", "2014-05-23", 132, "optional", { universe: "non_marvel_studios" }],
  ["x-men-apocalypse", "X-Men: Apocalypse", "movie", "2016-05-27", 144, "optional", { universe: "non_marvel_studios" }],
  ["dark-phoenix", "Dark Phoenix", "movie", "2019-06-07", 114, "optional", { universe: "non_marvel_studios" }],
  ["logan", "Logan", "movie", "2017-03-03", 137, "optional", { universe: "non_marvel_studios" }],
  ["deadpool", "Deadpool", "movie", "2016-02-12", 108, "optional", { universe: "non_marvel_studios" }],
  ["deadpool-2", "Deadpool 2", "movie", "2018-05-18", 119, "optional", { universe: "non_marvel_studios" }],
  ["deadpool-and-wolverine", "Deadpool & Wolverine", "movie", "2024-07-26", 128, "essential", { leads: true }],
  ["agatha-all-along", "Agatha All Along", "tv", "2024-09-18", 350, "optional"],
  ["captain-america-brave-new-world", "Captain America: Brave New World", "movie", "2025-02-14", 118, "essential", { leads: true }],
  ["thunderbolts", "Thunderbolts*", "movie", "2025-05-02", 127, "essential", { leads: true }],
  ["ironheart", "Ironheart", "tv", "2025-06-24", 270, "optional"],
  ["the-fantastic-four-first-steps", "The Fantastic Four: First Steps", "movie", "2025-07-25", 115, "essential", { leads: true }],
  ["spider-man-brand-new-day", "Spider-Man: Brand New Day", "movie", "2026-07-31", 130, "unconfirmed"],
];

export const TITLES: Title[] = rows.map(([id, title, type, release_date, runtime_minutes, importance, opts], i) => ({
  id,
  title,
  type,
  release_date,
  story_order_index: i + 1,
  runtime_minutes,
  universe: opts?.universe ?? "mcu",
  importance,
  poster_url: POSTERS[id] ?? null,
  leads_into_doomsday: opts?.leads ?? false,
}));
