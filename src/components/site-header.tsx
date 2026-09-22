import Link from "next/link";
import { LockButton } from "./lock-button";

const NAV = [
  { href: "/watch-order/story", label: "Watch order" },
  { href: "/planner", label: "Planner" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b-4 border-black bg-accent shadow-[0_4px_0_var(--color-violet)]">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-display text-2xl text-white [text-shadow:2px_2px_0_#000]">
          <svg viewBox="0 0 24 24" className="h-7 w-7 text-white" aria-hidden="true">
            <path fill="currentColor" d="M12 2 21 7v10l-9 5-9-5V7l9-5Zm0 4.2L6.6 9.2v5.6l5.4 3 5.4-3V9.2L12 6.2Z" />
            <circle cx="12" cy="12" r="2.2" fill="currentColor" />
          </svg>
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
        <div className="ml-auto">
          <LockButton />
        </div>
      </div>
      <nav aria-label="Main mobile" className="flex gap-1 overflow-x-auto border-t-2 border-black bg-violet/90 px-3 py-1.5 sm:hidden">
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} className="whitespace-nowrap rounded-md px-3 py-1.5 font-display text-white">
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
