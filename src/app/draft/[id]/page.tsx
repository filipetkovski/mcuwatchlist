"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/app-provider";
import { DRAFT_CHARACTERS } from "@/data/draft-characters";
import type { DraftPick } from "@/lib/types";

interface Player {
  id: string;
  username: string;
}

interface DraftGame {
  id: string;
  playerX: Player;
  playerO: Player;
  status: "pending" | "active" | "finished" | "declined";
  characterIds: string[];
  round: number;
  turn: string | null;
  currentBid: number;
  currentBidder: string | null;
  budgets: { x: number; o: number };
  picks: { x: DraftPick[]; o: DraftPick[] };
  winner: string | null;
  result: "win" | "draw" | null;
}

const POLL_MS = 2000;
const REVEAL_DELAY_MS = 900;

function characterOf(id: string) {
  return DRAFT_CHARACTERS.find((c) => c.id === id) ?? { id, name: "Unknown", alignment: "hero" as const, power: 0 };
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

  useEffect(() => {
    let stop = false;
    const load = async () => {
      const res = await fetch(`/api/draft/${gameId}`);
      const body = (await res.json().catch(() => ({}))) as { game?: DraftGame; error?: string };
      if (stop) return;
      if (!res.ok || !body.game) { setError(body.error ?? "Couldn't load this draft."); return; }
      setGame(body.game);
      setError(null);
    };
    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => { stop = true; window.clearInterval(id); };
  }, [gameId]);

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

      {(game.status === "active" || game.status === "finished") && (
        <>
          {game.status === "active" && currentCharacter && (
            <section aria-label="Up for bid" className="comic-panel space-y-3 p-5 text-center">
              <p className="text-xs uppercase tracking-widest text-muted">
                Character {game.round + 1} of {game.characterIds.length}
              </p>
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

          {game.status === "finished" && visibleX === game.picks.x.length && visibleO === game.picks.o.length && (
            <>
              <MatchupBreakdown
                xName={game.playerX.username}
                oName={game.playerO.username}
                xPicks={game.picks.x}
                oPicks={game.picks.o}
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
                    <p className="text-muted">Your picks dominated more matchups. +100 vibraniums.</p>
                  </>
                ) : (
                  <>
                    <p className="font-display text-2xl text-red-600">You lost the draft.</p>
                    <p className="text-muted">{opponent.username}&apos;s picks won more matchups. -50 vibraniums.</p>
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
      <div className="flex flex-wrap gap-1.5" aria-label={`${name}'s picks`}>
        {shown.length === 0 && <span className="text-xs text-muted">No picks yet</span>}
        {shown.map((p) => {
          const c = characterOf(p.characterId);
          return (
            <span
              key={p.characterId}
              title={showPower ? `${c.name} · ${c.power} power · won for $${p.price}` : `${c.name} · won for $${p.price}`}
              className={`rounded-full border-2 border-black px-2 py-1 text-[11px] font-semibold shadow-[2px_2px_0_#000] transition-opacity ${
                c.alignment === "hero" ? "bg-emerald-500/30" : "bg-red-600/20"
              }`}
            >
              {c.name}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function MatchupBreakdown({
  xName,
  oName,
  xPicks,
  oPicks,
}: {
  xName: string;
  oName: string;
  xPicks: DraftPick[];
  oPicks: DraftPick[];
}) {
  const sorted = (picks: DraftPick[]) =>
    [...picks].sort((a, b) => characterOf(b.characterId).power - characterOf(a.characterId).power);
  const xSorted = sorted(xPicks);
  const oSorted = sorted(oPicks);

  let xWins = 0;
  let oWins = 0;
  const matchups = xSorted.map((xPick, i) => {
    const oPick = oSorted[i];
    const xChar = characterOf(xPick.characterId);
    const oChar = characterOf(oPick.characterId);
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
