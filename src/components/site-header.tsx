"use client";

import Link from "next/link";
import { useState } from "react";
import { useApp } from "./app-provider";
import { LockButton } from "./lock-button";

const NAV = [
  { href: "/watch-order/story", label: "Watch order" },
  { href: "/planner", label: "Planner" },
];

export function SiteHeader() {
  const { user } = useApp();
  const [open, setOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <>
      <header className="site-header sticky top-0 z-30 border-b-4 border-black bg-accent shadow-[0_4px_0_var(--color-violet)]">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 font-display text-2xl text-white [text-shadow:2px_2px_0_#000]"
          >
            MCU Watchlist
          </Link>
          <nav aria-label="Main" className="ml-2 hidden gap-1 sm:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-1.5 text-sm font-display tracking-wider text-white transition-colors hover:bg-black/30"
              >
                {item.label}
              </Link>
            ))}
            {user?.role === "admin" && (
              <>
                <Link
                  href="/users"
                  className="rounded-md px-3 py-1.5 text-sm font-display tracking-wider text-white transition-colors hover:bg-black/30"
                >
                  Users
                </Link>
                <button
                  type="button"
                  onClick={() => setShareOpen(true)}
                  className="rounded-md px-3 py-1.5 text-sm font-display tracking-wider text-white transition-colors hover:bg-black/30"
                >
                  Share
                </button>
              </>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <LockButton />
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? "Close menu" : "Open menu"}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border-2 border-black bg-violet text-white sm:hidden"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>
        {open && (
          <nav id="mobile-nav" aria-label="Main mobile" className="flex flex-col gap-1 border-t-2 border-black bg-violet/90 px-3 py-2 sm:hidden">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 font-display text-white transition-colors hover:bg-black/20"
              >
                {item.label}
              </Link>
            ))}
            {user?.role === "admin" && (
              <>
                <Link
                  href="/users"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 font-display text-white transition-colors hover:bg-black/20"
                >
                  Users
                </Link>
                <button
                  type="button"
                  onClick={() => { setOpen(false); setShareOpen(true); }}
                  className="rounded-md px-3 py-2 text-left font-display text-white transition-colors hover:bg-black/20"
                >
                  Share
                </button>
              </>
            )}
          </nav>
        )}
      </header>
      {shareOpen && <ShareModal onClose={() => setShareOpen(false)} />}
    </>
  );
}

function ShareModal({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setBusy(true);
    setError(null);
    setCopied(false);
    const res = await fetch("/api/invite", { method: "POST" });
    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!res.ok) { setError(data.error ?? "Couldn't generate link."); setBusy(false); return; }
    setUrl(data.url ?? null);
    setBusy(false);
  };

  const share = async () => {
    if (!url) return;
    if (typeof navigator.share === "function") {
      await navigator.share({ title: "Join MCU Watchlist", url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/85 p-4 backdrop-blur-md"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="share-title" className="comic-panel w-full max-w-sm p-6">
        <div className="flex items-center justify-between">
          <h2 id="share-title" className="font-display text-2xl text-white [text-shadow:2px_2px_0_#000]">
            Invite someone
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-muted hover:text-ink"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <p className="mt-2 text-sm text-muted">Generate a single-use invite link. The person who opens it can create an account.</p>

        {error && (
          <p role="alert" className="mt-3 rounded-lg border-2 border-black bg-warn px-3 py-2 text-sm font-medium text-black">
            {error}
          </p>
        )}

        {url && (
          <div className="mt-4 space-y-2">
            <p className="break-all rounded-lg border-2 border-black bg-surface-2 px-3 py-2 font-mono text-xs text-muted">
              {url}
            </p>
            <button
              type="button"
              onClick={share}
              className="comic-btn w-full rounded-lg bg-accent px-4 py-2.5 text-base text-white"
            >
              {copied ? "Copied!" : typeof navigator !== "undefined" && typeof navigator.share === "function" ? "Share link" : "Copy link"}
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className={`comic-btn mt-3 w-full rounded-lg px-4 py-2.5 text-base text-white disabled:opacity-60 ${url ? "bg-surface-2 text-ink" : "bg-violet"}`}
        >
          {busy ? "Generating…" : url ? "Generate new link" : "Generate invite link"}
        </button>
      </div>
    </div>
  );
}
