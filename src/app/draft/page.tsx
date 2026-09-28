"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "@/components/app-provider";
import { DraftIcon } from "@/components/draft-icon";

interface Opponent {
  id: string;
  username: string;
}

interface InviteRow {
  id: string;
  opponent: Opponent;
}

interface ActiveGameRow {
  id: string;
  opponent: Opponent;
  yourTurn: boolean;
}

interface FinishedGameRow {
  id: string;
  opponent: Opponent;
  outcome: "win" | "loss" | "draw";
}

interface LeaderboardRow {
  id: string;
  username: string;
  vibranium: number;
  wins: number;
  losses: number;
  draws: number;
}

interface LobbyData {
  joined: boolean;
  opponents: Opponent[];
  incomingInvites: InviteRow[];
  outgoingInvites: InviteRow[];
  activeGames: ActiveGameRow[];
  finishedGames: FinishedGameRow[];
  leaderboard: LeaderboardRow[];
}

const POLL_MS = 4000;

export default function DraftPage() {
  const { user } = useApp();
  const router = useRouter();
  const [data, setData] = useState<LobbyData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState(false);
  const pendingOutgoingIds = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    const res = await fetch("/api/draft");
    const body = (await res.json().catch(() => ({}))) as LobbyData & { error?: string };
    if (!res.ok) { setError(body.error ?? "Couldn't load the draft lobby."); return; }

    const justAccepted = body.activeGames?.find((g) => pendingOutgoingIds.current.has(g.id));
    pendingOutgoingIds.current = new Set((body.outgoingInvites ?? []).map((i) => i.id));
    if (justAccepted) {
      router.push(`/draft/${justAccepted.id}`);
      return;
    }

    setData(body);
    setError(null);
  }, [router]);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => { window.clearTimeout(initial); window.clearInterval(id); };
  }, [load]);

  const invite = async (opponentId: string) => {
    setBusyId(opponentId);
    const res = await fetch("/api/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ opponentId }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) setError(body.error ?? "Couldn't send invite.");
    else await load();
    setBusyId(null);
  };

  const respond = async (gameId: string, accept: boolean) => {
    setBusyId(gameId);
    const res = await fetch(`/api/draft/${gameId}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accept }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) setError(body.error ?? "Couldn't respond to invite.");
    else await load();
    setBusyId(null);
  };

  const withdraw = async (gameId: string) => {
    setBusyId(gameId);
    const res = await fetch(`/api/draft/${gameId}`, { method: "DELETE" });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) setError(body.error ?? "Couldn't withdraw the invite.");
    else await load();
    setBusyId(null);
  };

  const join = async () => {
    setJoining(true);
    const res = await fetch("/api/draft/join", { method: "POST" });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) setError(body.error ?? "Couldn't join.");
    else await load();
    setJoining(false);
  };

  const copyLink = async () => {
    if (!user) return;
    const url = `${window.location.origin}/challenge/draft?from=${user.id}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const hasGameInProgress = data
    ? data.incomingInvites.length > 0 || data.outgoingInvites.length > 0 || data.activeGames.length > 0
    : false;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-bold tracking-tight">Draft</h1>
        <p className="text-muted">Bid your $20 budget across 10 heroes and villains. Most power in your 5 picks wins.</p>
      </header>

      {error && (
        <p role="alert" className="rounded-lg border-2 border-black bg-warn px-3 py-2 text-sm font-medium text-black">
          {error}
        </p>
      )}

      {!data ? (
        <p className="text-muted">Loading…</p>
      ) : !data.joined ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="join-draft-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-bg/85 p-4 backdrop-blur-md"
        >
          <div className="comic-panel w-full max-w-md p-8 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-black bg-violet shadow-[3px_3px_0_#000]">
              <DraftIcon className="h-9 w-9 text-white" />
            </span>
            <h2 id="join-draft-title" className="mt-4 font-display text-2xl text-white [text-shadow:2px_2px_0_#000]">
              Join Draft
            </h2>
            <p className="mt-3 text-sm text-muted">
              Accept to appear on the leaderboard and let friends challenge you. You can play as soon as you join.
            </p>
            <button
              type="button"
              disabled={joining}
              onClick={() => void join()}
              className="comic-btn mt-6 w-full rounded-lg bg-accent px-4 py-3 text-lg text-white disabled:opacity-60"
            >
              {joining ? "Joining…" : "Accept & join"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted">Challenge a friend directly</p>
            <button
              type="button"
              onClick={() => void copyLink()}
              className="comic-btn rounded-lg bg-surface-2 px-3 py-1.5 text-sm font-medium text-ink hover:border-accent disabled:opacity-60"
            >
              {copied ? "Copied!" : "Copy challenge link"}
            </button>
          </div>

          {data.incomingInvites.length > 0 && (
            <section className="comic-panel space-y-3 p-4">
              <h2 className="font-display text-xl font-semibold">Invites for you</h2>
              <ul className="space-y-2">
                {data.incomingInvites.map((invite_) => (
                  <li key={invite_.id} className="flex items-center justify-between gap-3 rounded-lg border-2 border-black bg-surface-2 px-3 py-2">
                    <span className="font-medium">{invite_.opponent.username} challenged you</span>
                    <span className="flex gap-2">
                      <button
                        type="button"
                        disabled={busyId === invite_.id}
                        onClick={() => void respond(invite_.id, true)}
                        className="comic-btn rounded-lg bg-accent px-3 py-1.5 text-sm text-white disabled:opacity-60"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        disabled={busyId === invite_.id}
                        onClick={() => void respond(invite_.id, false)}
                        className="comic-btn rounded-lg bg-surface-2 px-3 py-1.5 text-sm text-muted hover:text-ink disabled:opacity-60"
                      >
                        Decline
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {data.activeGames.length > 0 && (
            <section className="comic-panel space-y-3 p-4">
              <h2 className="font-display text-xl font-semibold">Your drafts</h2>
              <ul className="space-y-2">
                {data.activeGames.map((game) => (
                  <li key={game.id}>
                    <Link
                      href={`/draft/${game.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg border-2 border-black bg-surface-2 px-3 py-2 transition-colors hover:border-accent"
                    >
                      <span className="font-medium">vs {game.opponent.username}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase ${game.yourTurn ? "bg-accent text-white" : "text-muted"}`}>
                        {game.yourTurn ? "Your bid!" : "Waiting"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {data.outgoingInvites.length > 0 && (
            <section className="comic-panel space-y-3 p-4">
              <h2 className="font-display text-xl font-semibold">Waiting on a response</h2>
              <ul className="space-y-2">
                {data.outgoingInvites.map((invite_) => (
                  <li key={invite_.id} className="flex items-center justify-between gap-3 rounded-lg border-2 border-black bg-surface-2 px-3 py-2">
                    <span className="text-muted">Invite sent to <span className="font-medium text-ink">{invite_.opponent.username}</span></span>
                    <button
                      type="button"
                      disabled={busyId === invite_.id}
                      onClick={() => void withdraw(invite_.id)}
                      className="comic-btn rounded-lg bg-surface-2 px-3 py-1.5 text-sm text-muted hover:text-ink disabled:opacity-60"
                    >
                      Withdraw
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="comic-panel p-4">
            <h2 className="font-display text-xl font-semibold">Leaderboard</h2>
            <div className="comic-scroll mt-3 overflow-x-auto pb-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-black text-left">
                    <th className="whitespace-nowrap py-2 pr-1.5 font-display font-semibold">#</th>
                    <th className="whitespace-nowrap py-2 pr-1 font-display font-semibold"></th>
                    <th className="whitespace-nowrap py-2 pr-1 font-display font-semibold">Player</th>
                    <th className="whitespace-nowrap py-2 pr-2 font-display font-semibold">Vibraniums</th>
                    <th className="whitespace-nowrap py-2 pr-2 font-display font-semibold">W</th>
                    <th className="whitespace-nowrap py-2 pr-2 font-display font-semibold">L</th>
                    <th className="whitespace-nowrap py-2 font-display font-semibold">D</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.leaderboard.map((row, i) => (
                    <tr key={row.id} className={row.id === user?.id ? "bg-surface-2/60" : undefined}>
                      <td className="whitespace-nowrap py-2 pr-1.5 text-muted">{i + 1}</td>
                      <td className="whitespace-nowrap py-2 pr-1">
                        {row.id !== user?.id && !hasGameInProgress && (
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => void invite(row.id)}
                            className="comic-btn rounded-md bg-violet px-1.5 py-1 text-[10px] text-white disabled:opacity-60"
                          >
                            Challenge
                          </button>
                        )}
                      </td>
                      <td className="whitespace-nowrap py-2 pr-1 font-medium">
                        {row.username}
                        {row.id === user?.id && <span className="ml-1 text-xs text-muted">(you)</span>}
                      </td>
                      <td className="whitespace-nowrap py-2 pr-2 font-mono font-bold tabular-nums">
                        <span title="Vibraniums" className="inline-flex items-center gap-1">
                          {row.vibranium}
                          <VibraniumIcon className="h-4 w-4" />
                        </span>
                      </td>
                      <td className="whitespace-nowrap py-2 pr-2 tabular-nums text-muted">{row.wins}</td>
                      <td className="whitespace-nowrap py-2 pr-2 tabular-nums text-muted">{row.losses}</td>
                      <td className="whitespace-nowrap py-2 tabular-nums text-muted">{row.draws}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {data.finishedGames.length > 0 && (
            <section className="comic-panel space-y-3 p-4">
              <h2 className="font-display text-xl font-semibold">Recent results</h2>
              <ul className="space-y-2">
                {data.finishedGames.map((game) => (
                  <li key={game.id} className="flex items-center justify-between gap-3 rounded-lg border-2 border-black bg-surface-2 px-3 py-2">
                    <span>vs {game.opponent.username}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase ${
                        game.outcome === "win"
                          ? "bg-emerald-500/30 text-emerald-700"
                          : game.outcome === "loss"
                            ? "bg-red-600/20 text-red-700"
                            : "text-muted"
                      }`}
                    >
                      {game.outcome}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function VibraniumIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <polygon points="12,1.5 22,7.5 22,16.5 12,22.5 2,16.5 2,7.5" fill="#4c1d95" stroke="black" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="7" fill="none" stroke="#c4b5fd" strokeWidth="1.1" />
      <circle cx="12" cy="12" r="4" fill="none" stroke="#c4b5fd" strokeWidth="1.1" />
      <circle cx="12" cy="12" r="1.4" fill="#c4b5fd" />
    </svg>
  );
}
