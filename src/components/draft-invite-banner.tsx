"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "./app-provider";

interface Invite {
  id: string;
  opponent: { id: string; username: string };
}

const POLL_MS = 6000;

export function DraftInviteBanner() {
  const { status } = useApp();
  const router = useRouter();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status !== "unlocked") return;
    let stopped = false;
    const load = async () => {
      const res = await fetch("/api/draft");
      const body = (await res.json().catch(() => ({}))) as { incomingInvites?: Invite[] };
      if (!stopped && Array.isArray(body.incomingInvites)) setInvites(body.incomingInvites);
    };
    const initial = window.setTimeout(() => void load(), 0);
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => { stopped = true; window.clearTimeout(initial); window.clearInterval(id); };
  }, [status]);

  if (status !== "unlocked" || invites.length === 0) return null;

  const acceptAndPlay = async (gameId: string) => {
    setBusy(true);
    const res = await fetch(`/api/draft/${gameId}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accept: true }),
    });
    setBusy(false);
    if (res.ok) router.push(`/draft/${gameId}`);
  };

  const decline = async (gameId: string) => {
    setBusy(true);
    await fetch(`/api/draft/${gameId}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accept: false }),
    }).catch(() => {});
    setInvites((cur) => cur.filter((i) => i.id !== gameId));
    setBusy(false);
  };

  const [first, ...rest] = invites;

  return (
    <div role="status" className="mx-auto flex w-full max-w-6xl items-center gap-3 border-b-4 border-black bg-accent px-4 py-3 text-sm font-medium text-white sm:px-6">
      <span className="flex-1">
        <span className="font-display tracking-wide">{first.opponent.username}</span> challenged you to Draft!
        {rest.length > 0 && ` (+${rest.length} more waiting)`}
      </span>
      <button
        type="button"
        disabled={busy}
        onClick={() => void acceptAndPlay(first.id)}
        className="comic-btn shrink-0 rounded-lg bg-violet px-3 py-1.5 text-white disabled:opacity-60"
      >
        Accept &amp; play
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => void decline(first.id)}
        className="comic-btn shrink-0 rounded-lg bg-white/20 px-3 py-1.5 text-white hover:bg-white/30 disabled:opacity-60"
      >
        Decline
      </button>
    </div>
  );
}
