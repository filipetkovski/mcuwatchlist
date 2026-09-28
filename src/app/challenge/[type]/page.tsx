"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "@/components/app-provider";
import { DraftIcon } from "@/components/draft-icon";
import { TicTacToeIcon } from "@/components/tic-tac-toe-icon";

type GameType = "tic-tac-toe" | "draft";

function isValidType(t: string): t is GameType {
  return t === "tic-tac-toe" || t === "draft";
}

const META: Record<GameType, { label: string; description: string; path: string; Icon: React.ComponentType<{ className?: string }> }> = {
  "tic-tac-toe": {
    label: "Trivia Tic-Tac-Toe",
    description: "Answer Marvel trivia to claim a square.",
    path: "/tic-tac-toe",
    Icon: TicTacToeIcon,
  },
  draft: {
    label: "Draft",
    description: "Bid your $20 budget across heroes and villains.",
    path: "/draft",
    Icon: DraftIcon,
  },
};

export default function ChallengePage() {
  const params = useParams<{ type: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useApp();

  const type = params.type;
  const fromId = searchParams.get("from") ?? "";

  const [challengerName, setChallengerName] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!fromId) { setLoadError("Invalid challenge link."); return; }
    fetch(`/api/users/${fromId}`)
      .then((res) => res.json().then((body: { user?: { username: string }; error?: string }) => {
        if (!res.ok || !body.user) { setLoadError(body.error ?? "Invalid challenge link."); return; }
        setChallengerName(body.user.username);
      }))
      .catch(() => setLoadError("Couldn't load this challenge."));
  }, [fromId]);

  if (!isValidType(type)) {
    return <p role="alert" className="rounded-lg border-2 border-black bg-warn px-3 py-2 text-sm font-medium text-black">Unknown game type.</p>;
  }

  const meta = META[type];
  const { Icon } = meta;

  const accept = async () => {
    if (!user) { router.push(`/register?next=${encodeURIComponent(window.location.pathname + window.location.search)}`); return; }
    setBusy(true);
    setActionError(null);
    const apiPath = type === "tic-tac-toe" ? "/api/games" : "/api/draft";
    const res = await fetch(apiPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ opponentId: fromId }),
    });
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean; id?: string; error?: string };
    if (!res.ok) { setActionError(body.error ?? "Couldn't create the game."); setBusy(false); return; }
    router.push(body.id ? `${meta.path}/${body.id}` : meta.path);
  };

  const decline = () => router.push(meta.path);

  if (loadError) {
    return <p role="alert" className="rounded-lg border-2 border-black bg-warn px-3 py-2 text-sm font-medium text-black">{loadError}</p>;
  }

  if (!challengerName) {
    return <p className="text-muted">Loading…</p>;
  }

  if (user && user.id === fromId) {
    return (
      <div className="mx-auto max-w-md">
        <div className="comic-panel space-y-3 p-6 text-center">
          <p className="font-medium">This is your own challenge link.</p>
          <p className="text-sm text-muted">Share it with a friend so they can accept.</p>
          <button type="button" onClick={() => router.push(meta.path)} className="comic-btn rounded-lg bg-surface-2 px-4 py-2 text-sm text-muted hover:text-ink">
            Go to {meta.label}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="comic-panel space-y-5 p-8 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-black bg-violet shadow-[3px_3px_0_#000]">
          <Icon className="h-9 w-9 text-white" />
        </span>

        <div className="space-y-1">
          <h1 className="font-display text-2xl font-bold tracking-tight [text-shadow:2px_2px_0_#000]">
            {challengerName} challenged you!
          </h1>
          <p className="text-sm text-muted">{meta.label} · {meta.description}</p>
        </div>

        {actionError && (
          <p role="alert" className="rounded-lg border-2 border-black bg-warn px-3 py-2 text-sm font-medium text-black">
            {actionError}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void accept()}
            className="comic-btn w-full rounded-lg bg-accent px-4 py-3 text-lg text-white disabled:opacity-60"
          >
            {busy ? "Starting game…" : user ? "Accept & play" : "Sign in to accept"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={decline}
            className="comic-btn w-full rounded-lg bg-surface-2 px-4 py-2 text-sm text-muted hover:text-ink disabled:opacity-60"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
