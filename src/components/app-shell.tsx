"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PATHS } from "@/lib/paths";
import type { PathId } from "@/lib/types";
import { useApp } from "./app-provider";
import { AvengersMask } from "./avengers-mask";
import { DoomMask } from "./doom-mask";
import { IronManMask } from "./iron-man-mask";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { status } = useApp();
  const pathname = usePathname();
  const isPublic = pathname.startsWith("/register");
  const blocked = !isPublic && status !== "unlocked";

  return (
    <>
      <div inert={blocked} aria-hidden={blocked} className="flex min-h-full flex-1 flex-col">
        {children}
      </div>
      {blocked && <BlockingOverlay />}
    </>
  );
}

function BlockingOverlay() {
  const { status } = useApp();
  if (status === "checking") return <CheckingScreen />;
  if (status === "unconfigured") return <UnconfiguredScreen />;
  if (status === "locked") return <LoginDialog />;
  if (status === "path-pending") return <PathPickerDialog />;
  return null;
}

function CheckingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/85 backdrop-blur-md">
      <p className="text-muted">Checking…</p>
    </div>
  );
}

function UnconfiguredScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/85 p-4 backdrop-blur-md">
      <div role="dialog" aria-modal="true" className="comic-panel w-full max-w-sm p-6">
        <h2 className="font-display text-3xl text-white [text-shadow:2px_2px_0_#000]">MCU Watchlist</h2>
        <p className="mt-3 text-sm text-muted">
          The server isn&apos;t set up yet. Fill in <code className="font-mono text-ink">.env.local</code> and run{" "}
          <code className="font-mono text-ink">npm run db:setup</code>, then restart the app.
        </p>
      </div>
    </div>
  );
}

function LoginDialog() {
  const { login } = useApp();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const message = await login(username, password);
    if (message) {
      setError(message);
      setPassword("");
      inputRef.current?.focus();
    }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/85 p-4 backdrop-blur-md">
      <div role="dialog" aria-modal="true" aria-labelledby="login-title" className="comic-panel w-full max-w-sm p-6">
        <h2 id="login-title" className="font-display text-3xl text-white [text-shadow:2px_2px_0_#000]">
          MCU Watchlist
        </h2>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Username</span>
            <input
              ref={inputRef}
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full rounded-lg border-[3px] border-black bg-surface-2 px-3 py-2.5 text-base placeholder:text-muted"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Password</span>
            <input
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
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

const PATH_STYLES = {
  "new-to-marvel": {
    bg: "linear-gradient(160deg, #d22030 0%, #8f0d1a 55%, #4a0710 100%)",
    tagColor: "text-[#ffcf6b]",
    Mask: IronManMask,
  },
  "prepare-for-doomsday": {
    bg: "linear-gradient(160deg, #1f8a4f 0%, #0f5a33 55%, #08301c 100%)",
    tagColor: "text-[#b8f7cd]",
    Mask: DoomMask,
  },
  "rewatch-essentials": {
    bg: "linear-gradient(160deg, #7cc3ff 0%, #2e6fd9 55%, #123a73 100%)",
    tagColor: "text-[#cfe8ff]",
    Mask: AvengersMask,
  },
} as const;

function PathPickerDialog() {
  const { selectPath } = useApp();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (pathId: PathId) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const message = await selectPath(pathId);
    if (message) setError(message);
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/85 p-4 backdrop-blur-md">
      <div role="dialog" aria-modal="true" aria-labelledby="path-picker-title" className="comic-panel w-full max-w-2xl p-6">
        <h2 id="path-picker-title" className="font-display text-3xl text-white [text-shadow:2px_2px_0_#000]">
          Choose your path
        </h2>
        <p className="mt-2 text-sm text-muted">Pick the watch path that suits you. This sets what you&apos;ll track in the watch order and can&apos;t be changed later.</p>
        {error && (
          <p role="alert" className="mt-3 rounded-lg border-2 border-black bg-warn px-3 py-2 text-sm font-medium text-black">
            {error}
          </p>
        )}
        <ul className="mt-5 grid gap-4 sm:grid-cols-3">
          {PATHS.map((path) => {
            const style = PATH_STYLES[path.id];
            const { Mask } = style;
            return (
              <li key={path.id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void pick(path.id)}
                  className="relative flex h-full w-full flex-col overflow-hidden rounded-xl border-2 border-black p-5 text-left text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60"
                  style={{ background: style.bg }}
                >
                  <Mask className="pointer-events-none absolute -bottom-6 -right-6 h-28 w-auto select-none opacity-60" />
                  <span className="relative font-display text-lg font-semibold">{path.name}</span>
                  <span className={`relative mt-1 text-sm font-medium ${style.tagColor}`}>{path.tagline}</span>
                  <span className="relative mt-2 flex-1 text-sm text-white/85">{path.description}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
