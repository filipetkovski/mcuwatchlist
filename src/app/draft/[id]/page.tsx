"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/app-provider";
import { DRAFT_CHARACTERS } from "@/data/draft-characters";
import { useSocketRoom } from "@/lib/use-socket-room";
import type { DraftPick, DraftStatus } from "@/lib/types";

interface Player {
  id: string;
  username: string;
}

interface DraftGame {
  id: string;
  playerX: Player;
  playerO: Player;
  status: DraftStatus;
  characterIds: string[];
  round: number;
  turn: string | null;
  currentBid: number;
  currentBidder: string | null;
  budgets: { x: number; o: number };
  picks: { x: DraftPick[]; o: DraftPick[] };
  lineupX: string[] | null;
  lineupO: string[] | null;
  winner: string | null;
  result: "win" | "draw" | null;
}

const REVEAL_DELAY_MS = 900;

function characterOf(id: string) {
  return DRAFT_CHARACTERS.find((c) => c.id === id) ?? { id, name: "Unknown", alignment: "hero" as const, power: 0, poster_url: null };
}

/** Reveals newly-added picks one at a time instead of dumping them all in at once. */
function useReveal(actualCount: number): number {
  const [visible, setVisible] = useState(actualCount);
  const visibleRef = useRef(actualCount);

  useEffect(() => {
    if (actualCount <= visibleRef.current) {
      visibleRef.current = actualCount;
      setVisible(actualCount);
      return;
    }
    let cancelled = false;
    let timeoutId: number;
    const step = () => {
      if (cancelled) return;
      visibleRef.current += 1;
      setVisible(visibleRef.current);
      if (visibleRef.current < actualCount) timeoutId = window.setTimeout(step, REVEAL_DELAY_MS);
    };
    timeoutId = window.setTimeout(step, REVEAL_DELAY_MS);
    return () => { cancelled = true; window.clearTimeout(timeoutId); };
  }, [actualCount]);

  return visible;
}

export default function DraftGamePage() {
  const params = useParams<{ id: string }>();
  const gameId = params.id;
  const { user } = useApp();
  const [game, setGame] = useState<DraftGame | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [bidValue, setBidValue] = useState("");
  const [confirmSurrender, setConfirmSurrender] = useState(false);

  // Initial load
  useEffect(() => {
    let stop = false;
    fetch(`/api/draft/${gameId}`)
      .then((res) => res.json().then((body: { game?: DraftGame; error?: string }) => {
        if (stop) return;
        if (!res.ok || !body.game) { setError(body.error ?? "Couldn't load this draft."); return; }
        setGame(body.game);
        setError(null);
      }))
      .catch(() => { if (!stop) setError("Couldn't load this draft."); });
    return () => { stop = true; };
  }, [gameId]);

  // Real-time updates via socket
  useSocketRoom<DraftGame>(
    user ? `draft:${gameId}:${user.id}` : null,
    "draft:update",
    (updated) => { setGame(updated); setError(null); },
  );

  const visibleX = useReveal(game?.picks.x.length ?? 0);
  const visibleO = useReveal(game?.picks.o.length ?? 0);

  // Clear the bid input whenever a new round starts or the bid changes, without an effect.
  const roundKey = `${game?.round ?? 0}-${game?.currentBid ?? 0}`;
  const [lastRoundKey, setLastRoundKey] = useState(roundKey);
  if (roundKey !== lastRoundKey) {
    setLastRoundKey(roundKey);
    setBidValue("");
  }

  if (error) {
    return <p role="alert" className="rounded-lg border-2 border-black bg-warn px-3 py-2 text-sm font-medium text-black">{error}</p>;
  }
  if (!game || !user) return <p className="text-muted">Loading…</p>;

  const isX = user.id === game.playerX.id;
  const me = isX ? game.playerX : game.playerO;
  const opponent = isX ? game.playerO : game.playerX;
  const myBudget = isX ? game.budgets.x : game.budgets.o;
  const myTurn = game.status === "active" && game.turn === user.id;
  const opening = game.currentBidder === null;
  const currentCharacterId = game.status === "active" ? game.characterIds[game.round] : null;
  const currentCharacter = currentCharacterId ? characterOf(currentCharacterId) : null;
  const currentBidderName = game.currentBidder === game.playerX.id ? game.playerX.username : game.playerO.username;

  const myPicks = isX ? game.picks.x : game.picks.o;
  const myLineup = isX ? game.lineupX : game.lineupO;
  const myLineupSubmitted = myLineup !== null;
  const allPicksRevealed = visibleX === game.picks.x.length && visibleO === game.picks.o.length;

  const respond = async (accept: boolean) => {
    setBusy(true);
    const res = await fetch(`/api/draft/${gameId}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accept }),
    });
    const body = (await res.json().catch(() => ({}))) as { game?: DraftGame; error?: string };
    if (!res.ok) setError(body.error ?? "Couldn't respond to invite.");
    else if (body.game) setGame(body.game);
    setBusy(false);
  };

  const submitBid = async (amountOverride?: number) => {
    const amount = amountOverride ?? Number(bidValue);
    if (!Number.isInteger(amount) || amount < 0) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/draft/${gameId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "bid", amount }),
    });
    const body = (await res.json().catch(() => ({}))) as { game?: DraftGame; error?: string };
    if (!res.ok) setError(body.error ?? "Couldn't place your bid.");
    else if (body.game) setGame(body.game);
    setBusy(false);
  };

  const pass = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/draft/${gameId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pass" }),
    });
    const body = (await res.json().catch(() => ({}))) as { game?: DraftGame; error?: string };
    if (!res.ok) setError(body.error ?? "Couldn't pass.");
    else if (body.game) setGame(body.game);
    setBusy(false);
  };

  const submitLineup = async (lineup: string[]) => {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/draft/${gameId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "lineup", lineup }),
    });
    const body = (await res.json().catch(() => ({}))) as { game?: DraftGame; error?: string };
    if (!res.ok) setError(body.error ?? "Couldn't submit your lineup.");
    else if (body.game) setGame(body.game);
    setBusy(false);
  };

  const surrender = async () => {
    setBusy(true);
    const res = await fetch(`/api/draft/${gameId}/surrender`, { method: "POST" });
    const body = (await res.json().catch(() => ({}))) as { game?: DraftGame; error?: string };
    if (!res.ok) { setError(body.error ?? "Couldn't surrender."); setBusy(false); return; }
    if (body.game) setGame(body.game);
    setConfirmSurrender(false);
    setBusy(false);
  };

  const minBid = opening ? (myBudget > 0 ? 1 : 0) : game.currentBid + 1;
  const canRaise = myBudget >= minBid;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-1">
        <Link href="/draft" className="text-sm font-medium text-muted hover:text-ink">
          ← Back to lobby
        </Link>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Draft: {me.username} vs {opponent.username}
        </h1>
      </header>

      {error && (
        <p role="alert" className="rounded-lg border-2 border-black bg-warn px-3 py-2 text-sm font-medium text-black">
          {error}
        </p>
      )}

      {game.status === "pending" && (
        <div className="comic-panel space-y-3 p-4">
          {isX ? (
            <p className="text-muted">Waiting for {opponent.username} to accept your invite…</p>
          ) : (
            <>
              <p>{opponent.username} challenged you to a Draft!</p>
              <div className="flex gap-2">
                <button type="button" disabled={busy} onClick={() => void respond(true)} className="comic-btn rounded-lg bg-accent px-4 py-2 text-white disabled:opacity-60">
                  Accept
                </button>
                <button type="button" disabled={busy} onClick={() => void respond(false)} className="comic-btn rounded-lg bg-surface-2 px-4 py-2 text-muted hover:text-ink disabled:opacity-60">
                  Decline
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {game.status === "declined" && <p className="text-muted">This invite was declined.</p>}

      {(game.status === "active" || game.status === "lineup") && (
        <div className="flex justify-end">
          {!confirmSurrender ? (
            <button type="button" onClick={() => setConfirmSurrender(true)} className="text-xs text-muted underline underline-offset-2 hover:text-red-600">
              Surrender
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">Forfeit the draft?</span>
              <button type="button" disabled={busy} onClick={() => void surrender()} className="comic-btn rounded-md bg-red-600 px-2.5 py-1 text-xs text-white disabled:opacity-60">
                Yes, surrender
              </button>
              <button type="button" disabled={busy} onClick={() => setConfirmSurrender(false)} className="text-xs text-muted hover:text-ink">
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {(game.status === "active" || game.status === "lineup" || game.status === "finished") && (
        <>
          {game.status === "active" && currentCharacter && (
            <section aria-label="Up for bid" className="comic-panel space-y-3 p-5 text-center">
              <p className="text-xs uppercase tracking-widest text-muted">
                Character {game.round + 1} of {game.characterIds.length}
              </p>
              {currentCharacter.poster_url && (
                <div className="mx-auto h-48 w-32 overflow-hidden rounded-lg border-2 border-black shadow-[4px_4px_0_#000]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentCharacter.poster_url}
                    alt={currentCharacter.name}
                    className="h-full w-full object-cover object-top"
                  />
                </div>
              )}
              <h2 className="font-display text-3xl font-bold">{currentCharacter.name}</h2>
              <span
                className={`inline-block rounded-full border-2 border-black px-3 py-0.5 text-xs font-bold uppercase tracking-wide ${
                  currentCharacter.alignment === "hero" ? "bg-emerald-500/30 text-emerald-700" : "bg-red-600/20 text-red-700"
                }`}
              >
                {currentCharacter.alignment}
              </span>

              <div className="mt-2 rounded-lg border-2 border-black bg-surface-2 px-4 py-3">
                {opening ? (
                  <p className="text-sm text-muted">No bids yet - {myTurn ? "you open" : `waiting on ${opponent.username} to open`} the bidding.</p>
                ) : (
                  <p className="text-sm">
                    Current bid: <span className="font-mono font-bold">${game.currentBid}</span> by{" "}
                    <span className="font-semibold">{currentBidderName}</span>
                  </p>
                )}
              </div>

              {myTurn ? (
                <div className="space-y-2">
                  {opening && myBudget === 0 ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void submitBid(0)}
                      className="comic-btn w-full rounded-lg bg-accent px-4 py-2 text-white disabled:opacity-60"
                    >
                      You&apos;re out of money - bid $0
                    </button>
                  ) : !canRaise ? (
                    <div className="space-y-2 rounded-lg border-2 border-black bg-surface-2 p-3">
                      <p className="text-sm font-medium">
                        You only have <span className="font-mono font-bold">${myBudget}</span> left — you can&apos;t raise {currentBidderName}&apos;s bid of <span className="font-mono font-bold">${game.currentBid}</span>.
                      </p>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void pass()}
                        className="comic-btn w-full rounded-lg bg-surface px-4 py-2 text-muted hover:text-ink disabled:opacity-60"
                      >
                        Pass — let {currentBidderName} have it for ${game.currentBid}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-mono text-lg">$</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={minBid}
                        max={myBudget}
                        value={bidValue}
                        onChange={(e) => setBidValue(e.target.value)}
                        placeholder={String(minBid)}
                        aria-label="Your bid"
                        className="w-24 rounded-lg border-2 border-black bg-surface px-3 py-2 text-center font-mono text-lg"
                      />
                      <button
                        type="button"
                        disabled={busy || bidValue.trim() === "" || Number(bidValue) < minBid || Number(bidValue) > myBudget}
                        onClick={() => void submitBid()}
                        className="comic-btn rounded-lg bg-accent px-4 py-2 text-white disabled:opacity-40"
                      >
                        Bid
                      </button>
                    </div>
                  )}
                  {!opening && canRaise && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void pass()}
                      className="comic-btn w-full rounded-lg bg-surface-2 px-4 py-2 text-muted hover:text-ink disabled:opacity-60"
                    >
                      Pass - let {currentBidderName} have it for ${game.currentBid}
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted">Waiting for {opponent.username}…</p>
              )}
            </section>
          )}

          <section aria-label="Scoreboard" className="comic-panel grid grid-cols-2 divide-x-2 divide-black overflow-hidden">
            <PlayerColumn
              name={game.playerX.username}
              isMe={isX}
              budget={game.budgets.x}
              picks={game.picks.x}
              visibleCount={visibleX}
              showPower={game.status === "finished"}
            />
            <PlayerColumn
              name={game.playerO.username}
              isMe={!isX}
              budget={game.budgets.o}
              picks={game.picks.o}
              visibleCount={visibleO}
              showPower={game.status === "finished"}
            />
          </section>

          {game.status === "lineup" && allPicksRevealed && (
            myLineupSubmitted ? (
              <div className="comic-panel p-4 text-center">
                <p className="font-display text-lg font-semibold">Lineup locked in!</p>
                <p className="mt-1 text-sm text-muted">Waiting for {opponent.username} to set their lineup…</p>
              </div>
            ) : (
              <LineupBuilder
                picks={isX ? game.picks.x : game.picks.o}
                onSubmit={(lineup) => void submitLineup(lineup)}
                busy={busy}
              />
            )
          )}

          {game.status === "finished" && allPicksRevealed && game.lineupX && game.lineupO && (
            <>
              <MatchupBreakdown
                xName={game.playerX.username}
                oName={game.playerO.username}
                xLineup={game.lineupX}
                oLineup={game.lineupO}
              />
              <section className="comic-panel space-y-1 p-4 text-center">
                {game.result === "draw" ? (
                  <>
                    <p className="font-display text-2xl">It&apos;s a draw!</p>
                    <p className="text-muted">Neither side won more matchups. -10 vibraniums each.</p>
                  </>
                ) : game.winner === user.id ? (
                  <>
                    <p className="font-display text-2xl text-emerald-600">You won the draft!</p>
                    <p className="text-muted">Your lineup dominated more matchups. +100 vibraniums.</p>
                  </>
                ) : (
                  <>
                    <p className="font-display text-2xl text-red-600">You lost the draft.</p>
                    <p className="text-muted">{opponent.username}&apos;s lineup won more matchups. -50 vibraniums.</p>
                  </>
                )}
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}

function PlayerColumn({
  name,
  isMe,
  budget,
  picks,
  visibleCount,
  showPower,
}: {
  name: string;
  isMe: boolean;
  budget: number;
  picks: DraftPick[];
  visibleCount: number;
  showPower: boolean;
}) {
  const shown = picks.slice(0, visibleCount);
  return (
    <div className="space-y-3 p-4">
      <div>
        <p className="font-display text-lg font-semibold">
          {name}
          {isMe && <span className="ml-1.5 text-xs font-normal text-muted">(you)</span>}
        </p>
        <p className="font-mono text-2xl font-bold tabular-nums">${budget}</p>
      </div>
      <div className="flex flex-wrap gap-2" aria-label={`${name}'s picks`}>
        {shown.length === 0 && <span className="text-xs text-muted">No picks yet</span>}
        {shown.map((p) => {
          const c = characterOf(p.characterId);
          return (
            <div
              key={p.characterId}
              title={showPower ? `${c.name} · ${c.power} power · won for $${p.price}` : `${c.name} · won for $${p.price}`}
              className={`flex flex-col items-center gap-1 rounded-lg border-2 border-black p-1.5 shadow-[2px_2px_0_#000] transition-opacity ${
                c.alignment === "hero" ? "bg-emerald-500/30" : "bg-red-600/20"
              }`}
            >
              {c.poster_url ? (
                <div className="h-14 w-10 overflow-hidden rounded border border-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.poster_url} alt={c.name} className="h-full w-full object-cover object-top" />
                </div>
              ) : (
                <div className={`flex h-14 w-10 items-center justify-center rounded border border-black text-lg ${c.alignment === "hero" ? "bg-emerald-200" : "bg-red-200"}`}>
                  {c.alignment === "hero" ? "⚡" : "💀"}
                </div>
              )}
              <span className="max-w-[56px] text-center text-[10px] font-semibold leading-tight">{c.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LineupBuilder({
  picks,
  onSubmit,
  busy,
}: {
  picks: DraftPick[];
  onSubmit: (lineup: string[]) => void;
  busy: boolean;
}) {
  const [items, setItems] = useState<DraftPick[]>(() => [...picks]);
  const dragIndex = useRef<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  const move = (from: number, to: number) => {
    setItems((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  return (
    <section className="comic-panel space-y-4 p-4">
      <div>
        <h2 className="font-display text-xl font-semibold">Set your lineup</h2>
        <p className="mt-1 text-sm text-muted">
          Drag to order your heroes 1–5. Position 1 fights their position 1, and so on — your opponent can&apos;t see your order until both lineups are locked in.
        </p>
      </div>

      <ol className="space-y-2">
        {items.map((pick, i) => {
          const c = characterOf(pick.characterId);
          return (
            <li
              key={pick.characterId}
              draggable
              onDragStart={() => { dragIndex.current = i; setDragging(i); }}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragIndex.current === null || dragIndex.current === i) return;
                move(dragIndex.current, i);
                dragIndex.current = i;
              }}
              onDragEnd={() => { dragIndex.current = null; setDragging(null); }}
              className={`flex cursor-grab items-center gap-3 rounded-lg border-2 border-black bg-surface-2 px-3 py-2 transition-opacity active:cursor-grabbing ${dragging === i ? "opacity-50" : ""}`}
            >
              <span className="w-5 shrink-0 text-center font-mono text-sm font-bold text-muted">{i + 1}</span>
              {c.poster_url ? (
                <div className="h-10 w-7 shrink-0 overflow-hidden rounded border border-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.poster_url} alt={c.name} className="h-full w-full object-cover object-top" />
                </div>
              ) : (
                <div className={`flex h-10 w-7 shrink-0 items-center justify-center rounded border border-black text-sm ${c.alignment === "hero" ? "bg-emerald-200" : "bg-red-200"}`}>
                  {c.alignment === "hero" ? "⚡" : "💀"}
                </div>
              )}
              <span className="flex-1 font-semibold">{c.name}</span>
              <span
                className={`shrink-0 rounded-full border border-black px-2 py-0.5 text-[10px] font-bold uppercase ${
                  c.alignment === "hero" ? "bg-emerald-500/30 text-emerald-700" : "bg-red-600/20 text-red-700"
                }`}
              >
                {c.alignment}
              </span>
              <span className="flex shrink-0 gap-1">
                <button
                  type="button"
                  aria-label={`Move ${c.name} up`}
                  disabled={i === 0}
                  onClick={() => move(i, i - 1)}
                  className="rounded border border-black bg-surface px-1.5 py-0.5 text-xs disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Move ${c.name} down`}
                  disabled={i === items.length - 1}
                  onClick={() => move(i, i + 1)}
                  className="rounded border border-black bg-surface px-1.5 py-0.5 text-xs disabled:opacity-30"
                >
                  ↓
                </button>
              </span>
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        disabled={busy}
        onClick={() => onSubmit(items.map((p) => p.characterId))}
        className="comic-btn w-full rounded-lg bg-accent px-4 py-3 font-display text-lg text-white disabled:opacity-60"
      >
        Lock in lineup
      </button>
    </section>
  );
}

function MatchupBreakdown({
  xName,
  oName,
  xLineup,
  oLineup,
}: {
  xName: string;
  oName: string;
  xLineup: string[];
  oLineup: string[];
}) {
  let xWins = 0;
  let oWins = 0;
  const matchups = xLineup.map((xId, i) => {
    const oId = oLineup[i];
    const xChar = characterOf(xId);
    const oChar = characterOf(oId);
    const winner = xChar.power > oChar.power ? "x" : oChar.power > xChar.power ? "o" : "draw";
    if (winner === "x") xWins++;
    else if (winner === "o") oWins++;
    return { xChar, oChar, winner };
  });

  return (
    <section className="comic-panel space-y-3 p-4">
      <h2 className="font-display text-xl font-semibold">Matchups</h2>
      <ol className="space-y-2">
        {matchups.map(({ xChar, oChar, winner }, i) => (
          <li key={i} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-lg border-2 border-black bg-surface-2 px-3 py-2 text-sm">
            <span className={`text-right font-semibold ${winner === "x" ? "text-emerald-600" : winner === "o" ? "text-muted line-through" : ""}`}>
              {xChar.name}
              <span className="ml-1 font-mono text-xs font-normal">({xChar.power})</span>
            </span>
            <span className="shrink-0 text-xs font-bold text-muted">vs</span>
            <span className={`font-semibold ${winner === "o" ? "text-emerald-600" : winner === "x" ? "text-muted line-through" : ""}`}>
              {oChar.name}
              <span className="ml-1 font-mono text-xs font-normal">({oChar.power})</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="text-center text-sm text-muted">
        {xName}: <span className="font-semibold text-ink">{xWins}</span> win{xWins !== 1 ? "s" : ""} ·{" "}
        {oName}: <span className="font-semibold text-ink">{oWins}</span> win{oWins !== 1 ? "s" : ""}
      </p>
    </section>
  );
}
