"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { TradeRoomSummary } from "@/lib/types";

const POLL_MS = 3000;

interface LobbyData {
  myRoomId: string | null;
  openRooms: TradeRoomSummary[];
}

export default function TradePage() {
  const router = useRouter();
  const [data, setData] = useState<LobbyData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/trade");
    const body = (await res.json().catch(() => ({}))) as LobbyData & { error?: string };
    if (!res.ok) { setError(body.error ?? "Couldn't load the changing room lobby."); return; }
    if (body.myRoomId) { router.push(`/trade/${body.myRoomId}`); return; }
    setData(body);
    setError(null);
  }, [router]);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => { window.clearTimeout(initial); window.clearInterval(id); };
  }, [load]);

  const create = async () => {
    setCreating(true);
    const res = await fetch("/api/trade", { method: "POST" });
    const body = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
    if (!res.ok || !body.id) { setError(body.error ?? "Couldn't create a room."); setCreating(false); return; }
    router.push(`/trade/${body.id}`);
  };

  const join = async (id: string) => {
    setBusyId(id);
    const res = await fetch(`/api/trade/${id}/join`, { method: "POST" });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) { setError(body.error ?? "Couldn't join that room."); setBusyId(null); return; }
    router.push(`/trade/${id}`);
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-bold tracking-tight">Changing Room</h1>
        <p className="text-muted">Trade cards directly with another collector - propose any mix of cards for any mix of cards.</p>
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
          <button
            type="button"
            disabled={creating}
            onClick={() => void create()}
            className="comic-btn w-full rounded-lg bg-accent px-4 py-3 text-lg text-white disabled:opacity-60 sm:w-auto"
          >
            {creating ? "Creating…" : "Create a room"}
          </button>

          <section className="comic-panel space-y-3 p-4">
            <h2 className="font-display text-xl font-semibold">Open rooms</h2>
            {data.openRooms.length === 0 ? (
              <p className="text-sm text-muted">No one&apos;s waiting for a trade right now - create a room to start one.</p>
            ) : (
              <ul className="space-y-2">
                {data.openRooms.map((room) => (
                  <li
                    key={room.id}
                    className="flex items-center justify-between gap-3 rounded-lg border-2 border-black bg-surface-2 px-3 py-2"
                  >
                    <span className="font-medium">{room.host.username}&apos;s room</span>
                    <button
                      type="button"
                      disabled={busyId === room.id}
                      onClick={() => void join(room.id)}
                      className="comic-btn rounded-lg bg-accent px-3 py-1.5 text-sm text-white disabled:opacity-60"
                    >
                      Join
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
