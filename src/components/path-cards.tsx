"use client";

import Link from "next/link";
import { PATHS } from "@/lib/paths";
import { formatHours } from "@/lib/format";
import type { Title } from "@/lib/types";
import { useApp } from "./app-provider";
import { DoomMask } from "./doom-mask";

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
        const percent = card.list.length ? Math.round((watched / card.list.length) * 100) : 0;
        const doom = card.id === "prepare-for-doomsday";
        return (
          <li key={card.id}>
            <Link
              href={card.id === "new-to-marvel" ? "/watch-order/story" : `/watch-order/story?path=${card.id}`}
              className={`relative flex h-full flex-col overflow-hidden comic-panel bg-gradient-to-b ${ACCENTS[card.id] ?? "from-violet/25"} to-surface p-5 transition-transform hover:-translate-y-0.5`}
              style={doom ? { background: "linear-gradient(160deg, #1f8a4f 0%, #0f5a33 55%, #08301c 100%)" } : undefined}
            >
              {doom && (
                <DoomMask className="pointer-events-none absolute -bottom-6 -right-6 h-72 w-auto select-none opacity-70 drop-shadow-[4px_4px_0_rgba(0,0,0,0.5)]" />
              )}
              <h3 className="relative font-display text-xl font-semibold">{card.name}</h3>
              <p className={`relative mt-1 text-sm font-medium ${doom ? "text-[#b8f7cd]" : "text-accent-text"}`}>{card.tagline}</p>
              <p className={`relative mt-2 flex-1 text-sm ${doom ? "text-white/90" : "text-muted"}`}>{card.description}</p>
              <div className={`relative mt-4 h-1.5 overflow-hidden rounded-full ${doom ? "bg-black/40" : "bg-surface-2"}`}>
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ${doom ? "bg-[#b8f7cd]" : "bg-accent"}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className={`relative mt-2 text-xs ${doom ? "text-white/85" : "text-muted"}`}>
                {watched} of {card.list.length} watched · {formatHours(minutes)} total
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
