"use client";

import Link from "next/link";
import { useState } from "react";
import { PATHS, SHARED_PROGRESS_KEY } from "@/lib/paths";
import { isXMenTitle, sortTitles } from "@/lib/titles";
import type { Importance, OrderType, PathId, Title, TitleType } from "@/lib/types";
import { useApp } from "./app-provider";
import { Dashboard } from "./dashboard";
import { ProgressNotices } from "./progress-notices";
import { RateModal } from "./rate-modal";
import { TitleRow } from "./title-row";

interface Props {
  titles: Title[];
  initialOrder: OrderType;
  orderBasePath?: string;
}

const DEFAULT_PATH: PathId = "new-to-marvel";

const TYPE_OPTIONS: Array<[TitleType, string]> = [
  ["movie", "Movies"],
  ["tv", "TV"],
  ["special", "Specials"],
];
const IMPORTANCE_OPTIONS: Array<[Importance, string]> = [
  ["essential", "Essential"],
  ["recommended", "Recommended"],
  ["optional", "Optional"],
  ["unconfirmed", "Unconfirmed"],
];

const PAGE_SIZE = 100;

function toggleIn<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export function TitleExplorer({ titles, initialOrder, orderBasePath }: Props) {
  const { isWatched, setWatched, ratingFor, rateTitle, user } = useApp();
  const [order, setOrder] = useState<OrderType>(initialOrder);
  const [types, setTypes] = useState<Set<TitleType>>(new Set());
  const [importances, setImportances] = useState<Set<Importance>>(new Set());
  const [universeFilter, setUniverseFilter] = useState<"all" | "mcu" | "xmen">("all");
  const [status, setStatus] = useState<"all" | "unwatched" | "watched" | "skipped">("all");
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [ratingPrompt, setRatingPrompt] = useState<{ title: Title; pendingWatch: boolean } | null>(null);
  const [page, setPage] = useState(0);

  const activePathId: string = user?.pathId ?? DEFAULT_PATH;
  const pathDef = PATHS.find((p) => p.id === activePathId);
  const isAllMcuPath = activePathId === DEFAULT_PATH;

  const toggleWatched = (t: Title, value: boolean) => {
    if (value) {
      // Wait for the rating to be confirmed before marking watched, so the row's color only
      // changes once rating is done - not the instant it's clicked.
      if (ratingFor(t.id).mine === null) {
        setRatingPrompt({ title: t, pendingWatch: true });
        return;
      }
      setWatched(SHARED_PROGRESS_KEY, [t.id], true);
    } else {
      setWatched(SHARED_PROGRESS_KEY, [t.id], false);
      if (ratingFor(t.id).mine !== null) rateTitle(t.id, null);
    }
  };

  const scoped = sortTitles(
    isAllMcuPath
      ? universeFilter === "all"
        ? titles
        : universeFilter === "mcu"
          ? titles.filter((t) => t.universe === "mcu")
          : titles.filter(isXMenTitle)
      : pathDef
        ? titles.filter(pathDef.include)
        : titles,
    order,
  );
  const positions = new Map(scoped.map((t, i) => [t.id, i + 1]));
  const watchedIn = (id: string) => isWatched(SHARED_PROGRESS_KEY, id);

  const q = query.trim().toLowerCase();
  const visible = scoped.filter(
    (t) =>
      (types.size === 0 || types.has(t.type)) &&
      (importances.size === 0 || importances.has(t.importance)) &&
      (status === "all" || (status === "skipped" ? skipped.has(t.id) : !skipped.has(t.id) && (status === "watched") === watchedIn(t.id))) &&
      (q === "" || t.title.toLowerCase().includes(q)),
  );
  const filtersActive = types.size > 0 || importances.size > 0 || status !== "all" || q !== "";

  const pageCount = Math.max(Math.ceil(visible.length / PAGE_SIZE), 1);
  const currentPage = Math.min(page, pageCount - 1);
  const pageStart = currentPage * PAGE_SIZE;
  const pageItems = visible.slice(pageStart, pageStart + PAGE_SIZE);

  return (
    <div className="space-y-6">
      <Dashboard titles={scoped} label={pathDef?.name ?? "All titles"} pathId={SHARED_PROGRESS_KEY} />
      <ProgressNotices />

      <div className="flex flex-wrap items-center gap-3">
        <OrderToggle order={order} onChange={setOrder} basePath={orderBasePath} />
      </div>

      <div className="comic-panel p-4">
        <div className="flex items-center gap-3">
          <input
            type="search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(0); }}
            placeholder="Search titles"
            aria-label="Search titles"
            className="min-w-0 flex-1 rounded-lg border-2 border-black bg-surface-2 px-3 py-2 text-sm placeholder:text-muted shadow-[3px_3px_0_#000]"
          />
          <button
            type="button"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((o) => !o)}
            className={`comic-btn shrink-0 rounded-lg border-2 border-black px-3 py-2 text-sm font-semibold shadow-[3px_3px_0_#000] transition-colors ${filtersOpen ? "bg-accent text-white" : filtersActive ? "bg-violet text-white" : "bg-surface-2 text-muted hover:text-ink"}`}
          >
            Filters{filtersActive && !filtersOpen ? " ·" : ""}
          </button>
        </div>

        {filtersOpen && (
          <div className="mt-4 space-y-4">
            <FilterRow label="Type">
              {TYPE_OPTIONS.map(([value, label]) => (
                <Chip key={value} active={types.has(value)} onClick={() => { setTypes(toggleIn(types, value)); setPage(0); }}>
                  {label}
                </Chip>
              ))}
            </FilterRow>

            <FilterRow label="Importance">
              {IMPORTANCE_OPTIONS.map(([value, label]) => (
                <Chip key={value} active={importances.has(value)} onClick={() => { setImportances(toggleIn(importances, value)); setPage(0); }}>
                  {label}
                </Chip>
              ))}
            </FilterRow>

            {isAllMcuPath && (
              <FilterRow label="Universe">
                <Chip active={universeFilter === "all"} onClick={() => { setUniverseFilter("all"); setPage(0); }}>All</Chip>
                <Chip active={universeFilter === "mcu"} onClick={() => { setUniverseFilter("mcu"); setPage(0); }}>MCU</Chip>
                <Chip active={universeFilter === "xmen"} onClick={() => { setUniverseFilter("xmen"); setPage(0); }}>X-Men</Chip>
              </FilterRow>
            )}

            <FilterRow label="Status">
              {(["all", "unwatched", "watched", "skipped"] as const).map((value) => (
                <Chip key={value} active={status === value} onClick={() => { setStatus(value); setPage(0); }}>
                  {value === "all" ? "All" : value === "unwatched" ? "To watch" : value === "watched" ? "Watched" : "Skipped"}
                </Chip>
              ))}
            </FilterRow>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-muted">
        <span>
          {visible.length === 0
            ? "Showing 0 of 0"
            : `Showing ${pageStart + 1}–${Math.min(pageStart + PAGE_SIZE, visible.length)} of ${visible.length}`}
        </span>
        {filtersActive && (
          <button
            type="button"
            onClick={() => { setTypes(new Set()); setImportances(new Set()); setStatus("all"); setQuery(""); setPage(0); }}
            className="comic-btn rounded-lg bg-surface-2 px-3 py-1 text-xs text-muted hover:text-ink"
          >
            Clear filters
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-8 text-center text-muted">Nothing matches those filters.</p>
      ) : (
        <>
          <ol className="space-y-3">
            {pageItems.map((t) => (
              <TitleRow
                key={t.id}
                title={t}
                position={positions.get(t.id) ?? 0}
                watched={watchedIn(t.id)}
                skipped={skipped.has(t.id)}
                rating={ratingFor(t.id)}
                onToggle={(value) => toggleWatched(t, value)}
                onSkip={() => setSkipped((prev) => { const next = new Set(prev); if (next.has(t.id)) next.delete(t.id); else next.add(t.id); return next; })}
                onRate={() => setRatingPrompt({ title: t, pendingWatch: false })}
              />
            ))}
          </ol>

          {pageCount > 1 && (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(p - 1, 0))}
                disabled={currentPage === 0}
                aria-label="Previous 100 titles"
                className="comic-btn flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-x-0 disabled:hover:translate-y-0"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <path d="m15 5-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <p className="text-sm text-muted">
                Page {currentPage + 1} of {pageCount}
              </p>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(p + 1, pageCount - 1))}
                disabled={currentPage >= pageCount - 1}
                aria-label="Next 100 titles"
                className="comic-btn flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-x-0 disabled:hover:translate-y-0"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          )}
        </>
      )}

      {ratingPrompt && (
        <RateModal
          title={ratingPrompt.title}
          onClose={() => setRatingPrompt(null)}
          onCancel={() => setRatingPrompt(null)}
          onRated={ratingPrompt.pendingWatch ? () => setWatched(SHARED_PROGRESS_KEY, [ratingPrompt.title.id], true) : undefined}
        />
      )}
    </div>
  );
}

function OrderToggle({
  order,
  onChange,
  basePath,
}: {
  order: OrderType;
  onChange: (o: OrderType) => void;
  basePath?: string;
}) {
  const options: Array<[OrderType, string]> = [
    ["story", "Story order"],
    ["release", "Release order"],
  ];
  const base =
    "relative rounded-xl border-2 border-black px-4 py-3 text-left font-display text-sm font-semibold transition-transform hover:-translate-y-0.5 sm:text-base";
  const on: Record<OrderType, string> = {
    story: "bg-accent text-white shadow-[3px_3px_0_#000]",
    release: "bg-violet text-white shadow-[3px_3px_0_#000]",
  };
  const off = "bg-gradient-to-b from-surface-2 to-surface text-muted opacity-70 shadow-none hover:text-ink";
  return (
    <div role="group" aria-label="Watch order" className="flex flex-wrap gap-3">
      {options.map(([value, label]) =>
        basePath ? (
          <Link
            key={value}
            href={`${basePath}/${value}`}
            aria-current={order === value ? "page" : undefined}
            className={`${base} ${order === value ? on[value] : off}`}
          >
            {label}
          </Link>
        ) : (
          <button
            key={value}
            type="button"
            aria-pressed={order === value}
            onClick={() => onChange(value)}
            className={`${base} ${order === value ? on[value] : off}`}
          >
            {label}
          </button>
        ),
      )}
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1 pl-3">
      <span className="block font-display text-sm tracking-widest text-muted">{label}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`comic-btn rounded-xl px-3 py-1.5 text-sm transition-transform hover:-translate-y-0.5 ${
        active
          ? "bg-accent text-white"
          : "bg-surface-2 text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

