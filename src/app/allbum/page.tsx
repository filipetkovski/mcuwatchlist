"use client";

import { useCallback, useEffect, useState } from "react";
import { AvengersMask } from "@/components/avengers-mask";
import { CaptainAmericaShield } from "@/components/captain-america-shield";
import { DoomMask } from "@/components/doom-mask";
import { IronManMask } from "@/components/iron-man-mask";
import { VibraniumIcon } from "@/components/vibranium-icon";
import { DRAFT_CHARACTERS } from "@/data/draft-characters";
import { PACKS, rarityLabel, rarityOf } from "@/lib/album-data";
import type { AlbumCollection, AlbumPackType, AlbumPull, AlbumRarity } from "@/lib/types";

/** 8 per page (2 rows of 4) at sm and up, 4 per page (2x2) below that - matches Tailwind's `sm`. */
const DESKTOP_PAGE_SIZE = 8;
const MOBILE_PAGE_SIZE = 4;
const MOBILE_BREAKPOINT = "(min-width: 640px)";

const ALBUM_CHARACTERS = [...DRAFT_CHARACTERS].sort((a, b) => a.name.localeCompare(b.name));
/** Page -1 is the cover; character pages start at 0. */
const COVER_PAGE = -1;

function usePageSize(): number {
  const [pageSize, setPageSize] = useState(DESKTOP_PAGE_SIZE);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_BREAKPOINT);
    const update = () => setPageSize(mq.matches ? DESKTOP_PAGE_SIZE : MOBILE_PAGE_SIZE);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return pageSize;
}

const RARITY_BORDER: Record<AlbumRarity, string> = {
  legendary: "border-[#c97f10]",
  rare: "border-[#6b32c4]",
  uncommon: "border-[#1f8a56]",
  common: "border-black",
};

const RARITY_BADGE: Record<AlbumRarity, string> = {
  legendary: "bg-[#c97f10] text-white",
  rare: "bg-[#6b32c4] text-white",
  uncommon: "bg-[#1f8a56] text-white",
  common: "hidden",
};

const PACK_FOIL: Record<AlbumPackType, string> = {
  silver: "linear-gradient(120deg,#c8d3e6,#6b7fa8,#c8d3e6)",
  gold: "linear-gradient(120deg,#f6d67a,#b9861f,#f6d67a)",
  platinum: "linear-gradient(120deg,#e4d9ff,#8f5fe8,#e4d9ff)",
};

function characterOf(id: string) {
  return DRAFT_CHARACTERS.find((c) => c.id === id) ?? { id, name: "Unknown", alignment: "hero" as const, power: 0, poster_url: null };
}

type Phase = "idle" | "shaking" | "revealing";

export default function AllbumPage() {
  const [cards, setCards] = useState<AlbumCollection | null>(null);
  const [vibranium, setVibranium] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busyPack, setBusyPack] = useState<AlbumPackType | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [openingPack, setOpeningPack] = useState<AlbumPackType | null>(null);
  const [pulls, setPulls] = useState<AlbumPull[] | null>(null);
  const [revealedCount, setRevealedCount] = useState(0);

  const pageSize = usePageSize();
  const totalPages = Math.ceil(ALBUM_CHARACTERS.length / pageSize);

  const [page, setPage] = useState(COVER_PAGE);
  const [flipping, setFlipping] = useState<"next" | "prev" | null>(null);
  const [duplicatesOpen, setDuplicatesOpen] = useState(false);

  // If the page size changes (e.g. rotating the device) and the current page no longer exists,
  // clamp back to the last real page rather than showing a blank one.
  useEffect(() => {
    const id = window.setTimeout(() => {
      setPage((p) => (p >= 0 ? Math.min(p, totalPages - 1) : p));
    }, 0);
    return () => window.clearTimeout(id);
  }, [totalPages]);

  const load = useCallback(async () => {
    const res = await fetch("/api/album");
    const body = (await res.json().catch(() => ({}))) as { vibranium?: number; cards?: AlbumCollection; error?: string };
    if (!res.ok) { setError(body.error ?? "Couldn't load your album."); return; }
    setCards(body.cards ?? {});
    setVibranium(body.vibranium ?? 0);
    setError(null);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const openPack = async (packType: AlbumPackType) => {
    if (busyPack || phase !== "idle") return;
    setError(null);
    setBusyPack(packType);
    setOpeningPack(packType);
    setPhase("shaking");
    setPulls(null);
    setRevealedCount(0);

    const minShake = new Promise((resolve) => window.setTimeout(resolve, 900));
    const request = fetch("/api/album/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packType }),
    });
    const [res] = await Promise.all([request, minShake]);
    const body = (await res.json().catch(() => ({}))) as { vibranium?: number; pulls?: AlbumPull[]; error?: string };
    setBusyPack(null);

    if (!res.ok || !body.pulls) {
      setError(body.error ?? "Couldn't open the pack.");
      setPhase("idle");
      setOpeningPack(null);
      return;
    }

    setVibranium(body.vibranium ?? 0);
    setPulls(body.pulls);
    setPhase("revealing");
  };

  // Flip the pulled cards face-up one at a time instead of dumping the whole hand at once.
  useEffect(() => {
    if (phase !== "revealing" || !pulls || revealedCount >= pulls.length) return;
    const id = window.setTimeout(() => setRevealedCount((n) => n + 1), revealedCount === 0 ? 300 : 450);
    return () => window.clearTimeout(id);
  }, [phase, pulls, revealedCount]);

  const allRevealed = pulls !== null && revealedCount >= pulls.length;

  const collect = () => {
    if (!pulls) return;
    setCards((cur) => {
      const next = { ...(cur ?? {}) };
      for (const pull of pulls) next[pull.characterId] = (next[pull.characterId] ?? 0) + 1;
      return next;
    });
    setPhase("idle");
    setOpeningPack(null);
    setPulls(null);
    setRevealedCount(0);
  };

  const goToPage = (delta: 1 | -1) => {
    const target = page + delta;
    if (flipping || target < COVER_PAGE || target >= totalPages) return;
    setFlipping(delta === 1 ? "next" : "prev");
    window.setTimeout(() => setPage(target), 300);
    window.setTimeout(() => setFlipping(null), 600);
  };

  const collectedCount = cards ? Object.keys(cards).length : 0;
  const pageCharacters = page >= 0 ? ALBUM_CHARACTERS.slice(page * pageSize, page * pageSize + pageSize) : [];
  const duplicateCharacters = cards ? ALBUM_CHARACTERS.filter((c) => (cards[c.id] ?? 0) > 1) : [];

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-bold tracking-tight">Allbum</h1>
        <p className="text-muted">
          Spend vibraniums earned from Tic-Tac-Toe and Draft on card packs, and fill your album with every hero and villain.
        </p>
      </header>

      {error && (
        <p role="alert" className="rounded-lg border-2 border-black bg-warn px-3 py-2 text-sm font-medium text-black">
          {error}
        </p>
      )}

      {cards === null ? (
        <p className="text-muted">Loading…</p>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-lg border-2 border-black bg-surface-2 px-3 py-1.5 font-mono text-lg font-bold tabular-nums">
              {vibranium}
              <VibraniumIcon className="h-5 w-5" />
            </span>
            <span className="text-sm text-muted">
              {collectedCount} / {ALBUM_CHARACTERS.length} collected
            </span>
          </div>

          <section className="comic-panel space-y-4 p-4">
            <h2 className="font-display text-xl font-semibold">Card packs</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {(Object.keys(PACKS) as AlbumPackType[]).map((type) => (
                <PackShopCard
                  key={type}
                  type={type}
                  label={PACKS[type].label}
                  cost={PACKS[type].cost}
                  disabled={busyPack !== null || phase !== "idle" || vibranium < PACKS[type].cost}
                  busy={busyPack === type}
                  onOpen={() => void openPack(type)}
                />
              ))}
            </div>
          </section>

          <section className="comic-panel space-y-4 p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-xl font-semibold">Album</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => goToPage(-1)}
                  disabled={page === COVER_PAGE || flipping !== null}
                  className="comic-btn rounded-md bg-surface-2 px-3 py-1.5 text-sm text-ink disabled:opacity-40"
                  aria-label="Previous page"
                >
                  ←
                </button>
                <span className="text-sm text-muted tabular-nums">
                  {page === COVER_PAGE ? "Cover" : `Page ${page + 1} / ${totalPages}`}
                </span>
                <button
                  type="button"
                  onClick={() => goToPage(1)}
                  disabled={page === totalPages - 1 || flipping !== null}
                  className="comic-btn rounded-md bg-surface-2 px-3 py-1.5 text-sm text-ink disabled:opacity-40"
                  aria-label="Next page"
                >
                  →
                </button>
              </div>
            </div>

            <div
              className={
                flipping === "next" ? "album-page-flip-next" : flipping === "prev" ? "album-page-flip-prev" : ""
              }
            >
              {page === COVER_PAGE ? (
                <AlbumCover pageSize={pageSize} onOpen={() => goToPage(1)} />
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {pageCharacters.map((c) => {
                    const owned = cards[c.id] ?? 0;
                    const rarity = rarityOf(c.id);
                    return (
                      <div
                        key={c.id}
                        className={`flex flex-col overflow-hidden rounded-lg border-[3px] bg-surface-2 ${RARITY_BORDER[rarity]}`}
                        title={owned > 0 ? c.name : `${c.name} (not yet collected)`}
                      >
                        <div className="relative aspect-[2/3] w-full bg-surface">
                          {owned > 0 && c.poster_url ? (
                            <img src={c.poster_url} alt={c.name} className="h-full w-full object-cover object-top" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-3xl text-muted/50">?</div>
                          )}
                          {owned > 1 && (
                            <span className="absolute right-1 top-1 rounded-full border-2 border-black bg-warn px-1.5 py-0.5 text-[10px] font-bold text-black">
                              x{owned - 1}
                            </span>
                          )}
                          <span className={`absolute left-1 top-1 rounded-full border border-black/20 px-1.5 py-0.5 text-[9px] font-bold uppercase ${RARITY_BADGE[rarity]}`}>
                            {rarityLabel(rarity)}
                          </span>
                        </div>
                        <div className="px-1.5 py-1 text-center">
                          <p className="truncate text-[11px] font-medium">{c.name}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {duplicateCharacters.length > 0 && (
            <section className="comic-panel p-4">
              <button
                type="button"
                onClick={() => setDuplicatesOpen((v) => !v)}
                aria-expanded={duplicatesOpen}
                className="flex w-full items-center justify-between gap-3"
              >
                <h2 className="font-display text-xl font-semibold">Duplicates ({duplicateCharacters.length})</h2>
                <span className="comic-btn rounded-md bg-surface-2 px-3 py-1.5 text-sm text-ink">
                  {duplicatesOpen ? "Hide" : "Show"}
                </span>
              </button>
              {duplicatesOpen && (
                <div className="mt-4 flex flex-wrap gap-3">
                  {duplicateCharacters.map((c) => {
                    const owned = cards[c.id] ?? 0;
                    return (
                      <div
                        key={c.id}
                        className="w-16 shrink-0 overflow-hidden rounded-lg border-[3px] border-black bg-surface-2"
                        title={c.name}
                      >
                        <div className="relative aspect-[2/3] w-full bg-surface">
                          {c.poster_url ? (
                            <img src={c.poster_url} alt={c.name} className="h-full w-full object-cover object-top" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xl text-muted/50">?</div>
                          )}
                          <span className="absolute right-1 top-1 rounded-full border-2 border-black bg-warn px-1.5 py-0.5 text-[10px] font-bold text-black">
                            x{owned - 1}
                          </span>
                        </div>
                        <p className="truncate px-1 py-1 text-center text-[10px] font-medium">{c.name}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {openingPack && (
        <PackOpeningModal
          packLabel={PACKS[openingPack].label}
          phase={phase}
          pulls={pulls}
          revealedCount={revealedCount}
          allRevealed={allRevealed}
          onCollect={collect}
        />
      )}
    </div>
  );
}

function PackShopCard({
  type,
  label,
  cost,
  disabled,
  busy,
  onOpen,
}: {
  type: AlbumPackType;
  label: string;
  cost: number;
  disabled: boolean;
  busy: boolean;
  onOpen: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-black bg-surface-2 p-4">
      <div
        className="pack-foil h-28 w-20 rounded-lg border-[3px] border-black shadow-[3px_3px_0_#000]"
        style={{ backgroundImage: PACK_FOIL[type] }}
        aria-hidden="true"
      />
      <p className="font-display text-lg">{label}</p>
      <p className="inline-flex items-center gap-1 font-mono text-sm font-bold tabular-nums text-muted">
        {cost}
        <VibraniumIcon className="h-4 w-4" />
      </p>
      <button
        type="button"
        disabled={disabled}
        onClick={onOpen}
        className="comic-btn w-full rounded-lg bg-accent px-3 py-2 text-sm text-white disabled:opacity-50"
      >
        {busy ? "Opening…" : "Open"}
      </button>
    </div>
  );
}

function PackOpeningModal({
  packLabel,
  phase,
  pulls,
  revealedCount,
  allRevealed,
  onCollect,
}: {
  packLabel: string;
  phase: Phase;
  pulls: AlbumPull[] | null;
  revealedCount: number;
  allRevealed: boolean;
  onCollect: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/90 p-4 backdrop-blur-md">
      <div className="comic-panel flex w-full max-w-2xl flex-col items-center gap-6 p-8 text-center">
        {phase === "shaking" && (
          <>
            <h2 className="font-display text-2xl text-white [text-shadow:2px_2px_0_#000]">Opening {packLabel}…</h2>
            <div
              className="pack-shake pack-foil h-40 w-28 rounded-lg border-4 border-black shadow-[4px_4px_0_#000]"
              style={{ backgroundImage: "linear-gradient(120deg,#8f0d1a,#4d9bff,#8f0d1a)" }}
            />
          </>
        )}

        {phase === "revealing" && pulls && (
          <>
            <h2 className="font-display text-2xl text-white [text-shadow:2px_2px_0_#000]">{packLabel}</h2>
            <div className="flex flex-wrap justify-center gap-4">
              {pulls.map((pull, i) => (
                <PullCardView key={`${pull.characterId}-${i}`} pull={pull} revealed={i < revealedCount} index={i} />
              ))}
            </div>
            {allRevealed && (
              <button
                type="button"
                onClick={onCollect}
                className="comic-btn mt-2 rounded-lg bg-accent px-6 py-2.5 text-base text-white"
              >
                Collect
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PullCardView({ pull, revealed, index }: { pull: AlbumPull; revealed: boolean; index: number }) {
  const character = characterOf(pull.characterId);
  const rarity = rarityOf(pull.characterId);

  return (
    <div className="pull-card" data-revealed={revealed} style={{ animationDelay: `${index * 90}ms` }}>
      <div className="pull-card-inner">
        <div className="pull-card-face pull-card-back">
          <VibraniumIcon className="h-8 w-8 opacity-60" />
        </div>
        <div className={`pull-card-face pull-card-front border-[3px] ${RARITY_BORDER[rarity]}`}>
          <div className="relative flex-1 bg-surface">
            {character.poster_url ? (
              <img src={character.poster_url} alt={character.name} className="h-full w-full object-cover object-top" />
            ) : (
              <div className="flex h-full items-center justify-center px-1 text-center text-xs font-medium text-muted">{character.name}</div>
            )}
            <span
              className={`absolute left-1 top-1 rounded-full border-2 border-black px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                pull.isNew ? "bg-good text-black" : "bg-surface-2 text-muted"
              }`}
            >
              {pull.isNew ? "New" : "Dupe"}
            </span>
          </div>
          <div className="px-1 py-1 text-center">
            <p className="text-[11px] font-semibold leading-tight">{character.name}</p>
            <p className={`mt-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${RARITY_BADGE[rarity]}`}>
              {rarityLabel(rarity)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AlbumCover({ pageSize, onOpen }: { pageSize: number; onOpen: () => void }) {
  return (
    <div
      className="relative overflow-hidden rounded-lg border-[3px] border-black shadow-[4px_4px_0_#000]"
      style={{ background: "linear-gradient(160deg,#07160c,#123a20 45%,#1f5c33 100%)" }}
    >
      {/* Invisible copy of a real page's grid, so the cover is exactly as tall as the pages behind it. */}
      <div className="grid grid-cols-2 gap-3 opacity-0 sm:grid-cols-4" aria-hidden="true">
        {Array.from({ length: pageSize }).map((_, i) => (
          <div key={i} className="flex flex-col overflow-hidden rounded-lg border-[3px] border-transparent">
            <div className="aspect-[2/3] w-full" />
            <div className="px-1.5 py-1">
              <p className="truncate text-[11px] font-medium">&nbsp;</p>
            </div>
          </div>
        ))}
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-between p-6 text-center">
        <div>
          <h3 className="font-display text-4xl text-white [text-shadow:3px_3px_0_#000]">Allbum</h3>
          <p className="mt-1 text-xs uppercase tracking-[0.3em] text-[#9be8b4]">Heroes &amp; villains collection</p>
        </div>
        <div className="flex flex-wrap items-end justify-center gap-5">
          <DoomMask className="h-20 w-auto drop-shadow-[3px_3px_0_rgba(0,0,0,0.55)] sm:h-24" />
          <CaptainAmericaShield className="h-16 w-16 drop-shadow-[3px_3px_0_rgba(0,0,0,0.55)] sm:h-20 sm:w-20" />
          <IronManMask className="h-16 w-16 drop-shadow-[3px_3px_0_rgba(0,0,0,0.55)] sm:h-20 sm:w-20" />
          <AvengersMask className="h-16 w-16 drop-shadow-[3px_3px_0_rgba(0,0,0,0.55)] sm:h-20 sm:w-20" />
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="comic-btn rounded-lg bg-[#1f5c33] px-5 py-2.5 text-sm text-white"
        >
          Open Album →
        </button>
      </div>
    </div>
  );
}
