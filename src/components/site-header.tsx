"use client";

import Link from "next/link";
import { useState } from "react";
import { LockButton } from "./lock-button";

const NAV = [
  { href: "/watch-order/story", label: "Watch order" },
  { href: "/planner", label: "Planner" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
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
        </nav>
      )}
    </header>
  );
}
