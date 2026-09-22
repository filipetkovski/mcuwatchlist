"use client";

import { useMemo } from "react";
import { formatHours } from "@/lib/format";
import type { Title } from "@/lib/types";
import { useApp } from "./app-provider";

export function computeStats(titles: Title[], isWatched: (id: string) => boolean) {
  let watched = 0;
  let essentialRemaining = 0;
  let minutesRemaining = 0;
  for (const t of titles) {
    if (isWatched(t.id)) {
      watched++;
    } else {
      minutesRemaining += t.runtime_minutes;
      if (t.importance === "essential") essentialRemaining++;
    }
  }
  return {
    total: titles.length,
    watched,
    remaining: titles.length - watched,
    essentialRemaining,
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
    ["Essential left", String(stats.essentialRemaining)],
    ["Hours left", formatHours(stats.minutesRemaining)],
  ];

  return (
    <section aria-label="Progress dashboard" className="comic-panel p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">
          Your progress <span className="font-sans text-sm font-normal text-muted">· {label}</span>
        </h2>
        <span className="text-xs text-muted">{dataReady ? "Saved to your account" : "Loading…"}</span>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <div
          className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-valuenow={stats.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${stats.percent}% watched`}
        >
          <div className="h-full rounded-full bg-gradient-to-r from-accent to-violet transition-[width] duration-500" style={{ width: `${stats.percent}%` }} />
        </div>
        <span className="w-10 text-right font-mono text-sm tabular-nums">{stats.percent}%</span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {tiles.map(([name, value]) => (
          <div key={name} className="rounded-xl bg-surface-2 px-3 py-2.5">
            <dt className="text-xs text-muted">{name}</dt>
            <dd className="font-display text-2xl font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
