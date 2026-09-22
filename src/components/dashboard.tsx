"use client";

import { useMemo } from "react";
import { formatHours } from "@/lib/format";
import type { Title } from "@/lib/types";
import { useApp } from "./app-provider";

export function computeStats(titles: Title[], isWatched: (id: string) => boolean) {
  let watched = 0;
  let minutesRemaining = 0;
  for (const t of titles) {
    if (isWatched(t.id)) {
      watched++;
    } else {
      minutesRemaining += t.runtime_minutes;
    }
  }
  return {
    total: titles.length,
    watched,
    remaining: titles.length - watched,
    minutesRemaining,
    percent: titles.length === 0 ? 0 : Math.round((watched / titles.length) * 100),
  };
}

export function Dashboard({ titles, label, pathId }: { titles: Title[]; label: string; pathId: string }) {
  const { watchedFor, dataReady } = useApp();
  const watched = watchedFor(pathId);
  const stats = useMemo(() => computeStats(titles, (id) => id in watched), [titles, watched]);

  const tiles: Array<[string, string]> = [
    ["Total", String(stats.total)],
    ["Watched", String(stats.watched)],
    ["Remaining", String(stats.remaining)],
    ["Hours left", formatHours(stats.minutesRemaining)],
  ];

  return (
    <section aria-label="Progress dashboard">
      <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {tiles.map(([name, value]) => (
          <div key={name} className="rounded-xl bg-surface px-4 py-4">
            <dt className="text-sm text-muted">{name}</dt>
            <dd className="font-display text-3xl font-semibold tabular-nums sm:text-4xl">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
