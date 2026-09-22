"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "./app-provider";

/** Renders the site, and blocks it behind a password popup until unlocked. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { status } = useApp();
  const blocked = status !== "unlocked";

  return (
    <>
      <div inert={blocked} aria-hidden={blocked} className="flex min-h-full flex-1 flex-col">
        {children}
      </div>
      {blocked && <UnlockDialog />}
    </>
  );
}

function UnlockDialog() {
  const { status, unlock } = useApp();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "locked") input.current?.focus();
  }, [status]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const message = await unlock(password);
    if (message) {
      setError(message);
      setPassword("");
      input.current?.focus();
    }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/85 p-4 backdrop-blur-md">
      <div role="dialog" aria-modal="true" aria-labelledby="unlock-title" className="comic-panel w-full max-w-sm p-6">
        <h2 id="unlock-title" className="font-display text-3xl text-white [text-shadow:2px_2px_0_#000]">
          MCU Watchlist
        </h2>

        {status === "checking" && <p className="mt-3 text-muted">Checking…</p>}

        {status === "unconfigured" && (
          <p className="mt-3 text-sm text-muted">
            The server isn&apos;t set up yet. Fill in <code className="font-mono text-ink">.env.local</code> and run{" "}
            <code className="font-mono text-ink">npm run db:setup</code>, then restart the app.
          </p>
        )}

        {status === "locked" && (
          <form onSubmit={submit} className="mt-3 space-y-4">
            <p className="text-sm text-muted">Enter the password to unlock.</p>
            <label className="block text-sm">
              <span className="sr-only">Password</span>
              <input
                ref={input}
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full rounded-lg border-[3px] border-black bg-surface-2 px-3 py-2.5 text-base placeholder:text-muted"
              />
            </label>
            {error && (
              <p role="alert" className="rounded-lg border-2 border-black bg-warn px-3 py-2 text-sm font-medium text-black">
                {error}
              </p>
            )}
            <button type="submit" disabled={busy} className="comic-btn w-full rounded-lg bg-accent px-4 py-2.5 text-lg text-white disabled:opacity-60">
              {busy ? "Unlocking…" : "Unlock"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
