"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("key") ?? "";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!token) {
    return (
      <div className="comic-panel mx-auto mt-16 max-w-sm p-6">
        <h1 className="font-display text-2xl font-bold">Invalid link</h1>
        <p className="mt-2 text-sm text-muted">This invite link is missing or invalid. Ask an admin for a new one.</p>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, token }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) { setError(data.error ?? "Something went wrong."); setBusy(false); return; }
    router.push("/");
  };

  return (
    <div className="mx-auto mt-16 max-w-sm">
      <div className="comic-panel p-6">
        <h1 className="font-display text-3xl font-bold text-white [text-shadow:2px_2px_0_#000]">
          Create account
        </h1>
        <p className="mt-2 text-sm text-muted">You were invited to join MCU Watchlist.</p>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Username</span>
            <input
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              className="w-full rounded-lg border-[3px] border-black bg-surface-2 px-3 py-2.5 text-base placeholder:text-muted"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Password</span>
            <input
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Choose a password"
              className="w-full rounded-lg border-[3px] border-black bg-surface-2 px-3 py-2.5 text-base placeholder:text-muted"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Confirm password</span>
            <input
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat password"
              className="w-full rounded-lg border-[3px] border-black bg-surface-2 px-3 py-2.5 text-base placeholder:text-muted"
            />
          </label>
          {error && (
            <p role="alert" className="rounded-lg border-2 border-black bg-warn px-3 py-2 text-sm font-medium text-black">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="comic-btn w-full rounded-lg bg-accent px-4 py-2.5 text-lg text-white disabled:opacity-60"
          >
            {busy ? "Creating account…" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
