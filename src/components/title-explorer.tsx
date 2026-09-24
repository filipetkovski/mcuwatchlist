"use client";

import Link from "next/link";
import { useState } from "react";
import { formatRuntime, releaseYear } from "@/lib/format";
import { PATHS } from "@/lib/paths";
import { isXMenTitle, sortTitles } from "@/lib/titles";
import type { Importance, OrderType, PathId, Title, TitleRating, TitleType } from "@/lib/types";
import { useApp } from "./app-provider";
import { DoomsdayBadge, ImportanceBadge } from "./badges";
import { Dashboard } from "./dashboard";
import { ProgressNotices } from "./progress-notices";
import { RateModal } from "./rate-modal";

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
  const [ratingPrompt, setRatingPrompt] = useState<{ title: Title; revertOnCancel: boolean } | null>(null);

  const activePathId: string = user?.pathId ?? DEFAULT_PATH;
  const pathDef = PATHS.find((p) => p.id === activePathId);
  const isAllMcuPath = activePathId === DEFAULT_PATH;

  const toggleWatched = (t: Title, value: boolean) => {
    setWatched(activePathId, [t.id], value);
    if (value) {
      if (ratingFor(t.id).mine === null) setRatingPrompt({ title: t, revertOnCancel: true });
    } else if (ratingFor(t.id).mine !== null) {
      rateTitle(t.id, null);
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
  const watchedIn = (id: string) => isWatched(activePathId, id);

  const q = query.trim().toLowerCase();
  const visible = scoped.filter(
    (t) =>
      (types.size === 0 || types.has(t.type)) &&
      (importances.size === 0 || importances.has(t.importance)) &&
      (status === "all" || (status === "skipped" ? skipped.has(t.id) : !skipped.has(t.id) && (status === "watched") === watchedIn(t.id))) &&
      (q === "" || t.title.toLowerCase().includes(q)),
  );
  const filtersActive = types.size > 0 || importances.size > 0 || status !== "all" || q !== "";

  return (
    <div className="space-y-6">
      <Dashboard titles={scoped} label={pathDef?.name ?? "All titles"} pathId={activePathId} />
      <ProgressNotices />

      <div className="flex flex-wrap items-center gap-3">
        <OrderToggle order={order} onChange={setOrder} basePath={orderBasePath} />
      </div>

      <div className="comic-panel p-4">
        <div className="flex items-center gap-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
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
                <Chip key={value} active={types.has(value)} onClick={() => setTypes(toggleIn(types, value))}>
                  {label}
                </Chip>
              ))}
            </FilterRow>

            <FilterRow label="Importance">
              {IMPORTANCE_OPTIONS.map(([value, label]) => (
                <Chip key={value} active={importances.has(value)} onClick={() => setImportances(toggleIn(importances, value))}>
                  {label}
                </Chip>
              ))}
            </FilterRow>

            {isAllMcuPath && (
              <FilterRow label="Universe">
                <Chip active={universeFilter === "all"} onClick={() => setUniverseFilter("all")}>All</Chip>
                <Chip active={universeFilter === "mcu"} onClick={() => setUniverseFilter("mcu")}>MCU</Chip>
                <Chip active={universeFilter === "xmen"} onClick={() => setUniverseFilter("xmen")}>X-Men</Chip>
              </FilterRow>
            )}

            <FilterRow label="Status">
              {(["all", "unwatched", "watched", "skipped"] as const).map((value) => (
                <Chip key={value} active={status === value} onClick={() => setStatus(value)}>
                  {value === "all" ? "All" : value === "unwatched" ? "To watch" : value === "watched" ? "Watched" : "Skipped"}
                </Chip>
              ))}
            </FilterRow>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-muted">
        <span>Showing {visible.length} of {scoped.length}</span>
        {filtersActive && (
          <button
            type="button"
            onClick={() => { setTypes(new Set()); setImportances(new Set()); setStatus("all"); setQuery(""); }}
            className="comic-btn rounded-lg bg-surface-2 px-3 py-1 text-xs text-muted hover:text-ink"
          >
            Clear filters
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-8 text-center text-muted">Nothing matches those filters.</p>
      ) : (
        <ol className="space-y-3">
          {visible.map((t) => (
            <TitleRow
              key={t.id}
              title={t}
              position={positions.get(t.id) ?? 0}
              watched={watchedIn(t.id)}
              skipped={skipped.has(t.id)}
              rating={ratingFor(t.id)}
              onToggle={(value) => toggleWatched(t, value)}
              onSkip={() => setSkipped((prev) => { const next = new Set(prev); if (next.has(t.id)) next.delete(t.id); else next.add(t.id); return next; })}
              onRate={() => setRatingPrompt({ title: t, revertOnCancel: false })}
            />
          ))}
        </ol>
      )}

      {ratingPrompt && (
        <RateModal
          title={ratingPrompt.title}
          onClose={() => setRatingPrompt(null)}
          onCancel={() => {
            if (ratingPrompt.revertOnCancel) setWatched(activePathId, [ratingPrompt.title.id], false);
            setRatingPrompt(null);
          }}
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

const TYPE_LABEL: Record<TitleType, string> = { movie: "Movie", tv: "TV", special: "Special" };

function TitleRow({
  title: t,
  position,
  watched,
  skipped,
  rating,
  onToggle,
  onSkip,
  onRate,
}: {
  title: Title;
  position: number;
  watched: boolean;
  skipped: boolean;
  rating: TitleRating;
  onToggle: (watched: boolean) => void;
  onSkip: () => void;
  onRate: () => void;
}) {
  const showRateButton = watched && !skipped && rating.mine === null;
  const rowStyle = watched
    ? { borderColor: "#1f8a4f", backgroundColor: "rgb(31 138 79 / 0.4)" }
    : skipped
      ? { borderColor: "#b91c1c", backgroundColor: "rgb(185 28 28 / 0.15)" }
      : undefined;

  return (
    <li
      role="checkbox"
      aria-checked={watched}
      aria-label={`Mark ${t.title} as watched`}
      tabIndex={0}
      onClick={() => { if (!skipped) onToggle(!watched); }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (!skipped) onToggle(!watched);
        }
      }}
      className={`group flex cursor-pointer items-stretch overflow-hidden comic-panel transition-colors ${
        !watched && !skipped ? "hover:border-muted/60" : ""
      }`}
      style={rowStyle}
    >
      <div className="relative shrink-0 self-stretch">
        <Poster title={t} />
        {watched && (
          <div className="pointer-events-none absolute inset-0 bg-emerald-500/50" />
        )}
        {skipped && (
          <div className="pointer-events-none absolute inset-0 bg-red-600/40" />
        )}
        <span className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-black bg-surface-2 font-mono text-[10px] tabular-nums text-muted shadow-[2px_2px_0_#000]">
          {position}
        </span>
        <RatingBadge rating={rating} />
      </div>
      <div className="flex min-w-0 flex-1 items-center py-2 pl-3 pr-2 sm:py-2.5 sm:pl-4 sm:pr-2.5">
        <div className="min-w-0 flex-1">
          <span className={`block font-display text-base font-semibold leading-snug sm:text-lg ${watched || skipped ? "line-through decoration-muted" : ""}`}>
            {t.title}
          </span>
          <span className="mt-0.5 block text-xs text-muted sm:text-sm">
            {TYPE_LABEL[t.type]} · {releaseYear(t.release_date)} · {formatRuntime(t.runtime_minutes)}
            {t.universe === "non_marvel_studios" && " · Non-Marvel Studios"}
          </span>
          <span className="mt-1.5 flex flex-wrap gap-1.5 items-center">
            <ImportanceBadge importance={t.importance} />
            <DoomsdayBadge title={t} />
          </span>
        </div>
        {!watched && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSkip(); }}
            aria-label={skipped ? `Undo skip for ${t.title}` : `Skip ${t.title}`}
            className={`ml-3 shrink-0 rounded border-2 border-black px-2.5 py-1 font-display text-xs font-black uppercase tracking-wide shadow-[2px_2px_0_#000] transition-colors ${
              skipped
                ? "bg-surface-2 text-muted hover:bg-surface-2/80"
                : "bg-yellow-400 text-black hover:bg-yellow-300"
            }`}
          >
            {skipped ? "UNDO" : "SKIP!"}
          </button>
        )}
        {showRateButton && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRate(); }}
            aria-label={`Rate ${t.title}`}
            className="ml-3 shrink-0 rounded border-2 border-black bg-violet px-2.5 py-1 font-display text-xs font-black uppercase tracking-wide text-white shadow-[2px_2px_0_#000] transition-colors hover:bg-violet/80"
          >
            Rate
          </button>
        )}
      </div>
    </li>
  );
}

function RatingBadge({ rating }: { rating: TitleRating }) {
  if (rating.count === 0 || rating.average === null) {
    return (
      <span
        title="N/A"
        className="absolute right-1 top-1 flex h-5 items-center rounded-full border-2 border-black bg-surface-2 px-1.5 font-mono text-[10px] font-medium text-muted shadow-[2px_2px_0_#000]"
      >
        N/A
      </span>
    );
  }
  return (
    <span
      title={`${rating.average.toFixed(1)} average from ${rating.count} rating${rating.count === 1 ? "" : "s"}`}
      className="absolute right-1 top-1 flex h-5 items-center gap-0.5 rounded-full border-2 border-black bg-yellow-400 px-1.5 font-mono text-[10px] font-bold tabular-nums text-black shadow-[2px_2px_0_#000]"
    >
      ★ {rating.average.toFixed(1)}
    </span>
  );
}

function Poster({ title }: { title: Title }) {
  if (title.poster_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={title.poster_url}
        alt=""
        loading="lazy"
        className="h-full w-25 shrink-0 border-r-2 border-black object-cover sm:w-25"
      />
    );
  }
  const initials = title.title
    .replace(/[^A-Za-z0-9 ]/g, "")
    .split(" ")
    .filter((w) => w.length > 2 || /^\d/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <div
      aria-hidden="true"
      className="flex h-full w-20 shrink-0 items-center justify-center border-r-2 border-black bg-gradient-to-br from-surface-2 to-line font-display text-xs font-bold text-muted sm:w-25 sm:text-base"
    >
      {initials || "M"}
    </div>
  );
}
