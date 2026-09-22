"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { formatRuntime, releaseYear } from "@/lib/format";
import { PATHS } from "@/lib/paths";
import { sortTitles } from "@/lib/titles";
import type { Importance, OrderType, Title, TitleType } from "@/lib/types";
import { useApp } from "./app-provider";
import { DoomsdayBadge, ImportanceBadge } from "./badges";
import { Dashboard } from "./dashboard";
import { AvengersMask } from "./avengers-mask";
import { DoomMask } from "./doom-mask";
import { IronManMask } from "./iron-man-mask";
import { ProgressNotices } from "./progress-notices";

interface Props {
  /** The whole catalog; the selected path narrows it down. */
  titles: Title[];
  initialOrder: OrderType;
  /** When set, the order toggle links to `${orderBasePath}/story|release` instead of switching in place. */
  orderBasePath?: string;
}

const DEFAULT_PATH = "new-to-marvel";

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

// The selected path lives in the URL (?path=...). Read it as an external store so the statically
// generated page still server-renders the full list (useSearchParams would defer it to the client).
const PATH_EVENT = "mcuw:path-change";
const subscribePath = (cb: () => void) => {
  window.addEventListener("popstate", cb);
  window.addEventListener(PATH_EVENT, cb);
  return () => {
    window.removeEventListener("popstate", cb);
    window.removeEventListener(PATH_EVENT, cb);
  };
};
const getPathParam = () => new URLSearchParams(window.location.search).get("path");
const getServerPathParam = () => null;

function toggleIn<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export function TitleExplorer({ titles, initialOrder, orderBasePath }: Props) {
  const { isWatched, setWatched, schedules } = useApp();
  const [order, setOrder] = useState<OrderType>(initialOrder);
  const pathId = useSyncExternalStore(subscribePath, getPathParam, getServerPathParam) ?? DEFAULT_PATH;
  const [types, setTypes] = useState<Set<TitleType>>(new Set());
  const [importances, setImportances] = useState<Set<Importance>>(new Set());
  const [includeNonMarvel, setIncludeNonMarvel] = useState(false);
  const [status, setStatus] = useState<"all" | "unwatched" | "watched">("all");
  const [query, setQuery] = useState("");

  const pathOptions = [
    ...PATHS.map((p) => ({ id: p.id as string, name: p.name, include: p.include, saved: false })),
    ...schedules.map((s) => ({
      id: s.id,
      name: s.name,
      include: (t: Title) => s.schedule.titleIds.includes(t.id),
      saved: true,
    })),
  ];
  const selected = pathOptions.find((p) => p.id === pathId) ?? pathOptions[0];
  const activePathId = selected.id;
  const isAllMcuPath = activePathId === DEFAULT_PATH;

  const choosePath = (id: string) => {
    const url = new URL(window.location.href);
    if (id === DEFAULT_PATH) url.searchParams.delete("path");
    else url.searchParams.set("path", id);
    window.history.replaceState(null, "", url);
    window.dispatchEvent(new Event(PATH_EVENT));
  };

  const scoped = sortTitles(isAllMcuPath && includeNonMarvel ? titles : titles.filter(selected.include), order);
  const positions = new Map(scoped.map((t, i) => [t.id, i + 1]));
  const watchedIn = (id: string) => isWatched(activePathId, id);

  const q = query.trim().toLowerCase();
  const visible = scoped.filter(
    (t) =>
      (types.size === 0 || types.has(t.type)) &&
      (importances.size === 0 || importances.has(t.importance)) &&
      (status === "all" || (status === "watched") === watchedIn(t.id)) &&
      (q === "" || t.title.toLowerCase().includes(q)),
  );
  const filtersActive = types.size > 0 || importances.size > 0 || status !== "all" || q !== "";

  const markThrough = (id: string) => {
    const idx = scoped.findIndex((t) => t.id === id);
    setWatched(activePathId, scoped.slice(0, idx + 1).map((t) => t.id), true);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Path</p>
        <div className="flex flex-wrap gap-3" role="group" aria-label="Path">
          {pathOptions.map((p) => {
            const doom = p.id === "prepare-for-doomsday";
            const ironMan = p.id === "new-to-marvel";
            const avengers = p.id === "rewatch-essentials";
            const active = p.id === activePathId;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={active}
                onClick={() => choosePath(p.id)}
                className={`relative flex items-center gap-2 overflow-hidden rounded-xl border-2 border-black bg-gradient-to-b px-4 py-3 text-left transition-transform hover:-translate-y-0.5 ${
                  doom || ironMan || avengers ? "" : active ? "from-accent to-surface" : "from-surface-2 to-surface"
                } ${active ? "shadow-[3px_3px_0_#000]" : "opacity-70 shadow-none"}`}
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
                  <DoomMask className="pointer-events-none absolute -bottom-4 -right-3 h-16 w-auto select-none opacity-70" />
                )}
                {ironMan && (
                  <IronManMask className="pointer-events-none absolute -bottom-4 -right-3 h-16 w-auto select-none opacity-70" />
                )}
                {avengers && (
                  <AvengersMask className="pointer-events-none absolute -bottom-4 -right-3 h-14 w-auto select-none opacity-70" />
                )}
                <span
                  className={`relative font-display text-sm font-semibold sm:text-base ${
                    doom ? "text-[#b8f7cd]" : ironMan ? "text-[#ffcf6b]" : avengers ? "text-[#cfe8ff]" : ""
                  }`}
                >
                  {p.saved && <span aria-hidden="true">★ </span>}
                  {p.name}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted">Each path keeps its own checked titles.</p>
      </div>

      <Dashboard titles={scoped} label={selected.name} pathId={activePathId} />
      <ProgressNotices />

      <div className="flex flex-wrap items-center gap-3">
        <OrderToggle order={order} onChange={setOrder} basePath={orderBasePath} pathId={activePathId} />
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search titles"
        aria-label="Search titles"
        className="w-full rounded-lg border-2 border-black bg-surface-2 px-3 py-2 text-sm placeholder:text-muted"
      />

      <div className="space-y-3 comic-panel p-4">
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
            <Chip active={!includeNonMarvel} onClick={() => setIncludeNonMarvel(false)}>
              MCU only
            </Chip>
            <Chip active={includeNonMarvel} onClick={() => setIncludeNonMarvel(true)}>
              Include non-Marvel Studios
            </Chip>
          </FilterRow>
        )}
        <FilterRow label="Status">
          {(["all", "unwatched", "watched"] as const).map((value) => (
            <Chip key={value} active={status === value} onClick={() => setStatus(value)}>
              {value === "all" ? "All" : value === "unwatched" ? "To watch" : "Watched"}
            </Chip>
          ))}
        </FilterRow>
      </div>

      <div className="flex items-center justify-between text-sm text-muted">
        <span>
          Showing {visible.length} of {scoped.length}
        </span>
        {filtersActive && (
          <button
            type="button"
            className="underline underline-offset-2 hover:text-ink"
            onClick={() => {
              setTypes(new Set());
              setImportances(new Set());
              setStatus("all");
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
  pathId,
}: {
  order: OrderType;
  onChange: (o: OrderType) => void;
  basePath?: string;
  pathId: string;
}) {
  const options: Array<[OrderType, string]> = [
    ["story", "Story order"],
    ["release", "Release order"],
  ];
  const base = "rounded-md px-4 py-1.5 text-sm font-medium transition-colors";
  const on = "bg-accent text-white shadow-[2px_2px_0_#000]";
  const off = "text-muted hover:text-ink";
  const query = pathId === DEFAULT_PATH ? "" : `?path=${pathId}`;
  return (
    <div role="group" aria-label="Watch order" className="inline-flex rounded-lg border-2 border-black bg-surface-2 p-1">
      {options.map(([value, label]) =>
        basePath ? (
          <Link key={value} href={`${basePath}/${value}${query}`} aria-current={order === value ? "page" : undefined} className={`${base} ${order === value ? on : off}`}>
            {label}
          </Link>
        ) : (
          <button key={value} type="button" aria-pressed={order === value} onClick={() => onChange(value)} className={`${base} ${order === value ? on : off}`}>
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

function Chip({
  active,
  onClick,
  children,
  tone = "default",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: "default" | "doom";
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm transition-colors ${
        active
          ? `border-black text-white shadow-[2px_2px_0_#000] ${tone === "doom" ? "bg-[#1f8a4f]" : "bg-accent"}`
          : tone === "doom"
            ? "border-[#1f8a4f] text-[#8fe3ad] hover:text-white"
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
          onClick={(e) => {
            e.stopPropagation();
            onMarkThrough();
          }}
          title="Mark this and everything before it as watched"
          aria-label={`Mark ${t.title} and everything before it as watched`}
          className="mt-2 self-start shrink-0 rounded-md border border-line px-2 py-1 text-xs text-muted transition-colors hover:border-muted hover:text-ink sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
        >
          <span aria-hidden="true" className="sm:hidden">
            ↑ All
          </span>
          <span aria-hidden="true" className="hidden sm:inline">
            Watched through here
          </span>
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
        className="h-full w-14 shrink-0 border-r-2 border-black object-cover sm:w-20"
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
      className="flex h-full w-14 shrink-0 items-center justify-center border-r-2 border-black bg-gradient-to-br from-surface-2 to-line font-display text-xs font-bold text-muted sm:w-20 sm:text-base"
    >
      {initials || "M"}
    </div>
  );
}
