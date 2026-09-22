"use client";

import Link from "next/link";
import { useState } from "react";
import { formatRuntime, releaseYear } from "@/lib/format";
import { PATHS } from "@/lib/paths";
import { isXMenTitle, sortTitles } from "@/lib/titles";
import type { Importance, OrderType, PathId, Title, TitleType } from "@/lib/types";
import { useApp } from "./app-provider";
import { DoomsdayBadge, ImportanceBadge } from "./badges";
import { Dashboard } from "./dashboard";
import { ProgressNotices } from "./progress-notices";

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
  const { isWatched, setWatched, user } = useApp();
  const [order, setOrder] = useState<OrderType>(initialOrder);
  const [types, setTypes] = useState<Set<TitleType>>(new Set());
  const [importances, setImportances] = useState<Set<Importance>>(new Set());
  const [universeFilter, setUniverseFilter] = useState<"all" | "mcu" | "xmen">("all");
  const [status, setStatus] = useState<"unwatched" | "watched">("unwatched");
  const [query, setQuery] = useState("");

  const activePathId: string = user?.pathId ?? DEFAULT_PATH;
  const pathDef = PATHS.find((p) => p.id === activePathId);
  const isAllMcuPath = activePathId === DEFAULT_PATH;

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
      (status === "watched") === watchedIn(t.id) &&
      (q === "" || t.title.toLowerCase().includes(q)),
  );
  const filtersActive = types.size > 0 || importances.size > 0 || status !== "unwatched" || q !== "";

  const markThrough = (id: string) => {
    const idx = scoped.findIndex((t) => t.id === id);
    setWatched(activePathId, scoped.slice(0, idx + 1).map((t) => t.id), true);
  };

  return (
    <div className="space-y-6">
      <Dashboard titles={scoped} label={pathDef?.name ?? "All titles"} pathId={activePathId} />
      <ProgressNotices />

      <div className="flex flex-wrap items-center gap-3">
        <OrderToggle order={order} onChange={setOrder} basePath={orderBasePath} />
      </div>

      <div className="space-y-3 comic-panel p-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search titles"
          aria-label="Search titles"
          className="w-full rounded-lg border-2 border-black bg-surface-2 px-3 py-2 text-sm placeholder:text-muted"
        />
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
          {(["unwatched", "watched"] as const).map((value) => (
            <Chip key={value} active={status === value} onClick={() => setStatus(value)}>
              {value === "unwatched" ? "To watch" : "Watched"}
            </Chip>
          ))}
        </FilterRow>
      </div>

      <div className="flex items-center justify-between text-sm text-muted">
        <span>Showing {visible.length} of {scoped.length}</span>
        {filtersActive && (
          <button
            type="button"
            className="underline underline-offset-2 hover:text-ink"
            onClick={() => {
              setTypes(new Set());
              setImportances(new Set());
              setStatus("unwatched");
              setQuery("");
            }}
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
              onToggle={(value) => setWatched(activePathId, [t.id], value)}
              onMarkThrough={() => markThrough(t.id)}
            />
          ))}
        </ol>
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
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-full text-xs font-medium uppercase tracking-wide text-muted sm:w-24">{label}</span>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm transition-colors ${
        active
          ? "border-black bg-accent text-white shadow-[2px_2px_0_#000]"
          : "border-line text-muted hover:border-muted hover:text-ink"
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
  onToggle,
  onMarkThrough,
}: {
  title: Title;
  position: number;
  watched: boolean;
  onToggle: (watched: boolean) => void;
  onMarkThrough: () => void;
}) {
  return (
    <li
      role="checkbox"
      aria-checked={watched}
      aria-label={`Mark ${t.title} as watched`}
      tabIndex={0}
      onClick={() => onToggle(!watched)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle(!watched);
        }
      }}
      className={`group flex cursor-pointer items-stretch overflow-hidden comic-panel transition-colors ${
        watched ? "" : "hover:border-muted/60"
      }`}
      style={watched ? { borderColor: "#1f8a4f", backgroundColor: "rgb(31 138 79 / 0.4)" } : undefined}
    >
      <div className="relative shrink-0 self-stretch">
        <Poster title={t} />
        <span className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-black bg-surface-2 font-mono text-[10px] tabular-nums text-muted shadow-[2px_2px_0_#000]">
          {position}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center py-2 pl-3 pr-2 sm:py-2.5 sm:pl-4 sm:pr-2.5">
        <div className="min-w-0">
          <span className={`block font-display text-base font-semibold leading-snug sm:text-lg ${watched ? "line-through decoration-muted" : ""}`}>
            {t.title}
          </span>
          <span className="mt-0.5 block text-xs text-muted sm:text-sm">
            {TYPE_LABEL[t.type]} · {releaseYear(t.release_date)} · {formatRuntime(t.runtime_minutes)}
            {t.universe === "non_marvel_studios" && " · Non-Marvel Studios"}
          </span>
          <span className="mt-1.5 flex flex-wrap gap-1.5">
            <ImportanceBadge importance={t.importance} />
            <DoomsdayBadge title={t} />
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onMarkThrough(); }}
          title="Mark this and everything before it as watched"
          aria-label={`Mark ${t.title} and everything before it as watched`}
          className="mt-2 self-start shrink-0 rounded-md border border-line px-2 py-1 text-xs text-muted transition-colors hover:border-muted hover:text-ink sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
        >
          <span aria-hidden="true" className="sm:hidden">↑ All</span>
          <span aria-hidden="true" className="hidden sm:inline">Watched through here</span>
        </button>
      </div>
    </li>
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
