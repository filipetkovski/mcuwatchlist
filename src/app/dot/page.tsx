"use client";

import { useRef, useState } from "react";
import { VibraniumIcon } from "@/components/vibranium-icon";

type Phase = "idle" | "starting" | "playing" | "submitting" | "done";

// Minimum ms between two registered taps — faster than this is silently ignored.
const MIN_TAP_INTERVAL = 100;

export default function DotPage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [clicks, setClicks] = useState(0);
  const [awarded, setAwarded] = useState(0);
  const [vibranium, setVibranium] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pop, setPop] = useState(false);

  const timestampsRef = useRef<number[]>([]);
  const lastTapRef = useRef<number>(0);
  const sessionTokenRef = useRef<string | null>(null);

  const start = async () => {
    setError(null);
    setPhase("starting");

    // Fetch a one-time session token from the server before allowing any clicks.
    const res = await fetch("/api/dot");
    const body = (await res.json().catch(() => ({}))) as { token?: string; error?: string };
    if (!res.ok || !body.token) {
      setError(body.error ?? "Couldn't start a session.");
      setPhase("idle");
      return;
    }

    sessionTokenRef.current = body.token;
    timestampsRef.current = [];
    lastTapRef.current = 0;
    setClicks(0);
    setPhase("playing");
  };

  const tap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < MIN_TAP_INTERVAL) return;
    lastTapRef.current = now;
    timestampsRef.current = [...timestampsRef.current, now];
    setClicks((n) => n + 1);
    setPop(true);
    setTimeout(() => setPop(false), 120);
  };

  const stop = async () => {
    const count = timestampsRef.current.length;
    if (count === 0) { setPhase("idle"); return; }
    setPhase("submitting");

    const res = await fetch("/api/dot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clicks: count,
        timestamps: timestampsRef.current,
        token: sessionTokenRef.current,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { awarded?: number; vibranium?: number; error?: string };
    if (!res.ok) {
      setError(body.error ?? "Couldn't award vibranium.");
      setPhase("playing");
      return;
    }
    setAwarded(body.awarded ?? count);
    setVibranium(body.vibranium ?? 0);
    sessionTokenRef.current = null;
    setPhase("done");
  };

  const reset = () => {
    timestampsRef.current = [];
    sessionTokenRef.current = null;
    setClicks(0);
    setPhase("idle");
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-bold tracking-tight">Dot</h1>
        <p className="text-muted">Tap the dot. Every tap earns 1 vibranium. Stop when you&apos;re done to collect.</p>
      </header>

      {error && (
        <p role="alert" className="rounded-lg border-2 border-black bg-warn px-3 py-2 text-sm font-medium text-black">
          {error}
        </p>
      )}

      {phase === "idle" && (
        <div className="comic-panel flex flex-col items-center gap-8 p-10">
          <div className="h-40 w-40 rounded-full border-[6px] border-black bg-surface-2 opacity-30" />
          <button
            type="button"
            onClick={() => void start()}
            className="comic-btn rounded-lg bg-accent px-10 py-3 text-xl text-white"
          >
            Start
          </button>
        </div>
      )}

      {phase === "starting" && (
        <div className="comic-panel flex flex-col items-center gap-8 p-10">
          <p className="text-muted">Starting…</p>
        </div>
      )}

      {(phase === "playing" || phase === "submitting") && (
        <div className="comic-panel flex flex-col items-center gap-8 p-10">
          <div className="inline-flex items-center gap-2 font-mono text-4xl font-bold tabular-nums">
            {clicks}
            <VibraniumIcon className="h-8 w-8" />
          </div>

          <button
            type="button"
            onClick={tap}
            disabled={phase === "submitting"}
            aria-label="Tap the dot"
            className={`h-40 w-40 rounded-full border-[6px] border-black bg-accent shadow-[6px_6px_0_#000] disabled:opacity-60 ${pop ? "scale-95" : "scale-100"}`}
            style={{ transition: pop ? "transform 60ms ease-out" : "transform 120ms ease-in" }}
          />

          <button
            type="button"
            onClick={() => void stop()}
            disabled={phase === "submitting"}
            className="comic-btn rounded-lg bg-surface-2 px-8 py-2.5 text-base text-ink disabled:opacity-60"
          >
            {phase === "submitting" ? "Saving…" : "Stop"}
          </button>
        </div>
      )}

      {phase === "done" && (
        <div className="comic-panel flex flex-col items-center gap-6 p-10 text-center">
          <p className="font-display text-2xl text-white [text-shadow:2px_2px_0_#000]">
            You earned
          </p>
          <div className="inline-flex items-center gap-3 font-mono text-5xl font-bold tabular-nums">
            +{awarded}
            <VibraniumIcon className="h-10 w-10" />
          </div>
          <p className="text-sm text-muted">
            Total balance:{" "}
            <span className="inline-flex items-center gap-1 font-mono font-bold text-ink">
              {vibranium} <VibraniumIcon className="h-4 w-4" />
            </span>
          </p>
          <button
            type="button"
            onClick={reset}
            className="comic-btn rounded-lg bg-accent px-8 py-2.5 text-base text-white"
          >
            Play again
          </button>
        </div>
      )}
    </div>
  );
}
