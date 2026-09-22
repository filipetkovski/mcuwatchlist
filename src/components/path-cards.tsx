"use client";

import Link from "next/link";
import { PATHS } from "@/lib/paths";
import { formatHours } from "@/lib/format";
import type { Title } from "@/lib/types";
import { useApp } from "./app-provider";
import { AvengersMask } from "./avengers-mask";
import { DoomMask } from "./doom-mask";
import { IronManMask } from "./iron-man-mask";

const ACCENTS: Record<string, string> = {
  "new-to-marvel": "from-violet/25",
  "prepare-for-doomsday": "from-accent/40",
  "rewatch-essentials": "from-good/20",
};

interface Card {
  id: string;
  name: string;
  tagline: string;
  description: string;
  list: Title[];
}

export function PathCards({ titles }: { titles: Title[] }) {
  const { watchedFor, schedules } = useApp();

  const cards: Card[] = [
    ...PATHS.map((p) => ({ id: p.id, name: p.name, tagline: p.tagline, description: p.description, list: titles.filter(p.include) })),
    ...schedules.map((s) => ({
      id: s.id,
      name: s.name,
      tagline: "Your saved plan",
      description: `A custom viewing schedule covering ${s.schedule.titleIds.length} titles.`,
      list: titles.filter((t) => s.schedule.titleIds.includes(t.id)),
    })),
  ];

  return (
    <ul className="grid gap-4 md:grid-cols-3">
      {cards.map((card) => {
        const watchedMap = watchedFor(card.id);
        const watched = card.list.filter((t) => t.id in watchedMap).length;
        const minutes = card.list.reduce((sum, t) => sum + t.runtime_minutes, 0);
        const doom = card.id === "prepare-for-doomsday";
        const ironMan = card.id === "new-to-marvel";
        const avengers = card.id === "rewatch-essentials";
        const tinted = doom || ironMan || avengers;
        return (
          <li key={card.id}>
            <Link
              href={card.id === "new-to-marvel" ? "/watch-order/story" : `/watch-order/story?path=${card.id}`}
              className={`relative flex h-full flex-col overflow-hidden comic-panel bg-gradient-to-b ${ACCENTS[card.id] ?? "from-violet/25"} to-surface p-5 transition-transform hover:-translate-y-0.5`}
              style={
                doom
                  ? { background: "linear-gradient(160deg, #1f8a4f 0%, #0f5a33 55%, #08301c 100%)" }
                  : ironMan
                    ? { background: "linear-gradient(160deg, #d22030 0%, #8f0d1a 55%, #4a0710 100%)" }
                    : avengers
                      ? { background: "linear-gradient(160deg, #7cc3ff 0%, #2e6fd9 55%, #123a73 100%)" }
                      : undefined
              }
            >
              {doom && (
                <DoomMask className="pointer-events-none absolute -bottom-6 -right-6 h-72 w-auto select-none opacity-70 drop-shadow-[4px_4px_0_rgba(0,0,0,0.5)]" />
              )}
              {ironMan && (
                <IronManMask className="pointer-events-none absolute -bottom-6 -right-6 h-72 w-auto select-none opacity-70 drop-shadow-[4px_4px_0_rgba(0,0,0,0.5)]" />
              )}
              {avengers && (
                <AvengersMask className="pointer-events-none absolute -bottom-6 -right-6 h-64 w-auto select-none opacity-70 drop-shadow-[4px_4px_0_rgba(0,0,0,0.5)]" />
              )}
              <h3 className="relative font-display text-xl font-semibold">{card.name}</h3>
              <p
                className={`relative mt-1 text-sm font-medium ${
                  doom ? "text-[#b8f7cd]" : ironMan ? "text-[#ffcf6b]" : avengers ? "text-[#cfe8ff]" : "text-accent-text"
                }`}
              >
                {card.tagline}
              </p>
              <p className={`relative mt-2 flex-1 text-sm ${tinted ? "text-white/90" : "text-muted"}`}>{card.description}</p>
              <p className={`relative mt-4 text-xs ${tinted ? "text-white/85" : "text-muted"}`}>
                {watched} of {card.list.length} watched · {formatHours(minutes)} total
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
