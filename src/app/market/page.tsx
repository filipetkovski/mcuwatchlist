"use client";

import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/app-provider";
import { VibraniumIcon } from "@/components/vibranium-icon";
import { DRAFT_CHARACTERS } from "@/data/draft-characters";
import type { AlbumCollection, MarketListing } from "@/lib/types";

function characterOf(id: string) {
  return DRAFT_CHARACTERS.find((c) => c.id === id) ?? { id, name: "Unknown", alignment: "hero" as const, power: 0, poster_url: null };
}

const POLL_MS = 5000;

interface MarketData {
  vibranium: number;
  cards: AlbumCollection;
  listings: MarketListing[];
  myListings: MarketListing[];
}

export default function MarketPage() {
  const { user } = useApp();
  const [data, setData] = useState<MarketData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [sellCharacterId, setSellCharacterId] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [listing, setListing] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/market");
    const body = (await res.json().catch(() => ({}))) as MarketData & { error?: string };
    if (!res.ok) { setError(body.error ?? "Couldn't load the market."); return; }
    setData(body);
    setError(null);
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => { window.clearTimeout(initial); window.clearInterval(id); };
  }, [load]);

  const duplicateCharacters = data ? DRAFT_CHARACTERS.filter((c) => (data.cards[c.id] ?? 0) > 1) : [];

  const sell = async () => {
    const price = Number(sellPrice);
    if (!sellCharacterId || !Number.isInteger(price) || price <= 0) {
      setError("Pick a character and a valid price.");
      return;
    }
    setListing(true);
    const res = await fetch("/api/market", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characterId: sellCharacterId, price }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) setError(body.error ?? "Couldn't create the listing.");
    else {
      setSellCharacterId("");
      setSellPrice("");
      await load();
    }
    setListing(false);
  };

  const cancel = async (id: string) => {
    setBusyId(id);
    const res = await fetch(`/api/market/${id}`, { method: "DELETE" });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) setError(body.error ?? "Couldn't cancel that listing.");
    else await load();
    setBusyId(null);
  };

  const buy = async (id: string) => {
    setBusyId(id);
    const res = await fetch(`/api/market/${id}/buy`, { method: "POST" });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) setError(body.error ?? "Couldn't buy that card.");
    else await load();
    setBusyId(null);
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-bold tracking-tight">Market</h1>
        <p className="text-muted">Sell your duplicate cards for vibraniums, or buy what other players are selling.</p>
      </header>

      {error && (
        <p role="alert" className="rounded-lg border-2 border-black bg-warn px-3 py-2 text-sm font-medium text-black">
          {error}
        </p>
      )}

      {!data ? (
        <p className="text-muted">Loading…</p>
      ) : (
        <div className="space-y-6">
          <span className="inline-flex items-center gap-2 rounded-lg border-2 border-black bg-surface-2 px-3 py-1.5 font-mono text-lg font-bold tabular-nums">
            {data.vibranium}
            <VibraniumIcon className="h-5 w-5" />
          </span>

          <section className="comic-panel space-y-4 p-4">
            <h2 className="font-display text-xl font-semibold">Sell a duplicate</h2>
            {duplicateCharacters.length === 0 ? (
              <p className="text-sm text-muted">You don&apos;t have any spare duplicates to sell yet.</p>
            ) : (
              <div className="flex flex-wrap items-end gap-3">
                <select
                  value={sellCharacterId}
                  onChange={(e) => setSellCharacterId(e.target.value)}
                  className="rounded-lg border-[3px] border-black bg-surface-2 px-3 py-2 text-sm"
                >
                  <option value="">Pick a character…</option>
                  {duplicateCharacters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (x{(data.cards[c.id] ?? 0) - 1} spare)
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  max={50000}
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  placeholder="Price"
                  className="w-28 rounded-lg border-[3px] border-black bg-surface-2 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  disabled={listing}
                  onClick={() => void sell()}
                  className="comic-btn rounded-lg bg-accent px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                  {listing ? "Listing…" : "List for sale"}
                </button>
              </div>
            )}
          </section>

          {data.myListings.length > 0 && (
            <section className="comic-panel space-y-3 p-4">
              <h2 className="font-display text-xl font-semibold">Your listings</h2>
              <ul className="space-y-2">
                {data.myListings.map((l) => {
                  const character = characterOf(l.characterId);
                  return (
                    <li
                      key={l.id}
                      className="flex items-center justify-between gap-3 rounded-lg border-2 border-black bg-surface-2 px-3 py-2"
                    >
                      <span className="flex items-center gap-2">
                        <span className="font-medium">{character.name}</span>
                        <span className="inline-flex items-center gap-1 font-mono text-sm text-muted">
                          {l.price}
                          <VibraniumIcon className="h-4 w-4" />
                        </span>
                      </span>
                      {l.status === "open" ? (
                        <button
                          type="button"
                          disabled={busyId === l.id}
                          onClick={() => void cancel(l.id)}
                          className="comic-btn rounded-lg bg-surface-2 px-3 py-1.5 text-sm text-muted hover:text-ink disabled:opacity-60"
                        >
                          Cancel
                        </button>
                      ) : (
                        <span className="text-xs uppercase tracking-wide text-muted">{l.status}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="comic-panel space-y-4 p-4">
            <h2 className="font-display text-xl font-semibold">For sale</h2>
            {data.listings.length === 0 ? (
              <p className="text-sm text-muted">Nobody&apos;s selling anything right now.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {data.listings.map((l) => {
                  const character = characterOf(l.characterId);
                  const isMine = l.seller.id === user?.id;
                  return (
                    <div key={l.id} className="flex flex-col overflow-hidden rounded-lg border-[3px] border-black bg-surface-2">
                      <div className="relative aspect-[2/3] w-full bg-surface">
                        {character.poster_url ? (
                          <img src={character.poster_url} alt={character.name} className="h-full w-full object-cover object-top" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-3xl text-muted/50">?</div>
                        )}
                      </div>
                      <div className="space-y-1.5 px-2 py-2 text-center">
                        <p className="truncate text-[11px] font-medium">{character.name}</p>
                        <p className="truncate text-[10px] text-muted">by {l.seller.username}</p>
                        <p className="inline-flex items-center justify-center gap-1 font-mono text-xs font-bold tabular-nums">
                          {l.price}
                          <VibraniumIcon className="h-3.5 w-3.5" />
                        </p>
                        <button
                          type="button"
                          disabled={isMine || busyId === l.id || data.vibranium < l.price}
                          onClick={() => void buy(l.id)}
                          className="comic-btn w-full rounded-lg bg-accent px-2 py-1.5 text-xs text-white disabled:opacity-50"
                        >
                          {isMine ? "Your listing" : busyId === l.id ? "Buying…" : "Buy"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
