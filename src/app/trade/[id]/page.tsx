"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/app-provider";
import { DRAFT_CHARACTERS } from "@/data/draft-characters";
import type { AlbumCollection, TradeRoom } from "@/lib/types";

const POLL_MS = 2500;

function characterOf(id: string) {
  return DRAFT_CHARACTERS.find((c) => c.id === id) ?? { id, name: "Unknown", alignment: "hero" as const, power: 0, poster_url: null };
}

function countBy(ids: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const id of ids) m.set(id, (m.get(id) ?? 0) + 1);
  return m;
}

export default function TradeRoomPage() {
  const { user } = useApp();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const roomId = params.id;

  const [room, setRoom] = useState<TradeRoom | null>(null);
  const [myCards, setMyCards] = useState<AlbumCollection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadRoom = useCallback(async () => {
    const res = await fetch(`/api/trade/${roomId}`);
    const body = (await res.json().catch(() => ({}))) as { room?: TradeRoom; error?: string };
    if (!res.ok || !body.room) { setError(body.error ?? "Couldn't load this room."); return; }
    setRoom(body.room);
    setError(null);
  }, [roomId]);

  const loadCards = useCallback(async () => {
    const res = await fetch("/api/album");
    const body = (await res.json().catch(() => ({}))) as { cards?: AlbumCollection };
    setMyCards(body.cards ?? {});
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => { void loadRoom(); void loadCards(); }, 0);
    const id = window.setInterval(() => void loadRoom(), POLL_MS);
    return () => { window.clearTimeout(initial); window.clearInterval(id); };
  }, [loadRoom, loadCards]);

  if (error && !room) {
    return (
      <div className="space-y-4">
        <p role="alert" className="rounded-lg border-2 border-black bg-warn px-3 py-2 text-sm font-medium text-black">{error}</p>
        <button type="button" onClick={() => router.push("/trade")} className="comic-btn rounded-lg bg-surface-2 px-4 py-2 text-sm text-ink">
          Back to lobby
        </button>
      </div>
    );
  }
  if (!room || !user) return <p className="text-muted">Loading…</p>;

  const isHost = room.host.id === user.id;
  const myOffer = isHost ? room.hostOffer : room.guestOffer;
  const theirOffer = isHost ? room.guestOffer : room.hostOffer;
  const myConfirmed = isHost ? room.hostConfirmed : room.guestConfirmed;
  const theirConfirmed = isHost ? room.guestConfirmed : room.hostConfirmed;
  const other = isHost ? room.guest : room.host;

  const leave = async () => {
    setBusy(true);
    await fetch(`/api/trade/${room.id}`, { method: "DELETE" }).catch(() => {});
    router.push("/trade");
  };

  const submitOffer = async (next: string[]) => {
    setBusy(true);
    const res = await fetch(`/api/trade/${room.id}/offer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characterIds: next }),
    });
    const body = (await res.json().catch(() => ({}))) as { room?: TradeRoom; error?: string };
    if (!res.ok || !body.room) setError(body.error ?? "Couldn't update your offer.");
    else { setRoom(body.room); setError(null); }
    setBusy(false);
  };

  const adjustOffer = (characterId: string, delta: 1 | -1) => {
    if (delta === 1) {
      void submitOffer([...myOffer, characterId]);
    } else {
      const idx = myOffer.lastIndexOf(characterId);
      if (idx === -1) return;
      void submitOffer([...myOffer.slice(0, idx), ...myOffer.slice(idx + 1)]);
    }
  };

  const setConfirmed = async (confirmed: boolean) => {
    setBusy(true);
    const res = await fetch(`/api/trade/${room.id}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmed }),
    });
    const body = (await res.json().catch(() => ({}))) as { room?: TradeRoom; error?: string };
    if (!res.ok || !body.room) setError(body.error ?? "Couldn't update your confirmation.");
    else { setRoom(body.room); setError(null); }
    setBusy(false);
  };

  const myOfferCounts = countBy(myOffer);
  const theirOfferCounts = countBy(theirOffer);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-bold tracking-tight">Changing Room</h1>
        <p className="text-muted">
          {room.status === "open" && "Waiting for someone to join…"}
          {room.status === "active" && `Trading with ${other?.username ?? "…"}`}
          {room.status === "completed" && "Trade complete!"}
          {room.status === "cancelled" && "This trade was cancelled."}
        </p>
      </header>

      {error && (
        <p role="alert" className="rounded-lg border-2 border-black bg-warn px-3 py-2 text-sm font-medium text-black">{error}</p>
      )}

      {room.status === "open" && (
        <section className="comic-panel space-y-3 p-4 text-center">
          <p className="text-muted">Share the Changing Room lobby with a friend so they can join your room.</p>
          <button type="button" disabled={busy} onClick={() => void leave()} className="comic-btn rounded-lg bg-surface-2 px-4 py-2 text-sm text-ink disabled:opacity-60">
            Cancel room
          </button>
        </section>
      )}

      {room.status === "active" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <section className="comic-panel space-y-3 p-4">
              <h2 className="font-display text-lg font-semibold">Your offer</h2>
              {myOffer.length === 0 ? (
                <p className="text-sm text-muted">Nothing offered yet.</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {Array.from(myOfferCounts.entries()).map(([id, count]) => (
                    <li key={id} className="rounded-full border-2 border-black bg-surface-2 px-3 py-1 text-xs font-medium">
                      {characterOf(id).name}{count > 1 ? ` x${count}` : ""}
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs uppercase tracking-wide text-muted">{myConfirmed ? "You confirmed" : "Not confirmed yet"}</p>
            </section>
            <section className="comic-panel space-y-3 p-4">
              <h2 className="font-display text-lg font-semibold">{other?.username ?? "Their"} offer</h2>
              {theirOffer.length === 0 ? (
                <p className="text-sm text-muted">Nothing offered yet.</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {Array.from(theirOfferCounts.entries()).map(([id, count]) => (
                    <li key={id} className="rounded-full border-2 border-black bg-surface-2 px-3 py-1 text-xs font-medium">
                      {characterOf(id).name}{count > 1 ? ` x${count}` : ""}
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs uppercase tracking-wide text-muted">{theirConfirmed ? "They confirmed" : "Not confirmed yet"}</p>
            </section>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void setConfirmed(!myConfirmed)}
              className={`comic-btn rounded-lg px-5 py-2.5 text-sm text-white disabled:opacity-60 ${myConfirmed ? "bg-surface-2 text-ink" : "bg-accent"}`}
            >
              {myConfirmed ? "Unconfirm" : "Confirm trade"}
            </button>
            <button type="button" disabled={busy} onClick={() => void leave()} className="comic-btn rounded-lg bg-surface-2 px-4 py-2.5 text-sm text-ink disabled:opacity-60">
              Leave room
            </button>
          </div>

          <section className="comic-panel space-y-4 p-4">
            <h2 className="font-display text-xl font-semibold">Your cards</h2>
            {!myCards ? (
              <p className="text-sm text-muted">Loading…</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {DRAFT_CHARACTERS.filter((c) => (myCards[c.id] ?? 0) > 0).map((c) => {
                  const owned = myCards[c.id] ?? 0;
                  const staged = myOfferCounts.get(c.id) ?? 0;
                  return (
                    <div key={c.id} className="flex flex-col overflow-hidden rounded-lg border-[3px] border-black bg-surface-2">
                      <div className="relative aspect-[2/3] w-full bg-surface">
                        {c.poster_url ? (
                          <img src={c.poster_url} alt={c.name} className="h-full w-full object-cover object-top" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-3xl text-muted/50">?</div>
                        )}
                      </div>
                      <div className="space-y-1 px-2 py-2 text-center">
                        <p className="truncate text-[11px] font-medium">{c.name}</p>
                        <p className="text-[10px] text-muted">own {owned}</p>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            disabled={busy || staged === 0}
                            onClick={() => adjustOffer(c.id, -1)}
                            className="comic-btn h-7 w-7 rounded-md bg-surface-2 text-sm text-ink disabled:opacity-40"
                          >
                            −
                          </button>
                          <span className="w-5 text-sm font-bold tabular-nums">{staged}</span>
                          <button
                            type="button"
                            disabled={busy || staged >= owned}
                            onClick={() => adjustOffer(c.id, 1)}
                            className="comic-btn h-7 w-7 rounded-md bg-accent text-sm text-white disabled:opacity-40"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {(room.status === "completed" || room.status === "cancelled") && (
        <section className="comic-panel space-y-4 p-4">
          {room.status === "completed" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h2 className="font-display text-lg font-semibold">You gave</h2>
                {myOffer.length === 0 ? <p className="text-sm text-muted">Nothing.</p> : (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {Array.from(myOfferCounts.entries()).map(([id, count]) => (
                      <li key={id} className="rounded-full border-2 border-black bg-surface-2 px-3 py-1 text-xs font-medium">
                        {characterOf(id).name}{count > 1 ? ` x${count}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold">You received</h2>
                {theirOffer.length === 0 ? <p className="text-sm text-muted">Nothing.</p> : (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {Array.from(theirOfferCounts.entries()).map(([id, count]) => (
                      <li key={id} className="rounded-full border-2 border-black bg-good/40 px-3 py-1 text-xs font-medium">
                        {characterOf(id).name}{count > 1 ? ` x${count}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
          <button type="button" onClick={() => router.push("/trade")} className="comic-btn rounded-lg bg-accent px-5 py-2.5 text-sm text-white">
            Back to lobby
          </button>
        </section>
      )}
    </div>
  );
}
