"use client";

import { DraftIcon } from "./draft-icon";
import { useApp } from "./app-provider";

export function DraftNotice() {
  const { status, user, dismissDraftNotice } = useApp();
  if (status !== "unlocked" || !user || user.draftNoticeSeen) return null;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="draft-notice-title" className="fixed inset-0 z-50 flex items-center justify-center bg-bg/85 p-4 backdrop-blur-md">
      <div className="comic-panel w-full max-w-lg p-8 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-black bg-violet shadow-[3px_3px_0_#000]">
          <DraftIcon className="h-9 w-9 text-white" />
        </span>
        <h2 id="draft-notice-title" className="mt-4 font-display text-3xl text-white [text-shadow:2px_2px_0_#000]">
          New game: Draft!
        </h2>
        <p className="mt-3 text-base text-muted">
          Challenge a friend to a $20 hero &amp; villain auction. Ten characters, one at a time - bid what you can
          afford, pass to let your opponent have it, and whoever&apos;s 5 picks add up to the most power wins.
        </p>
        <button
          type="button"
          onClick={dismissDraftNotice}
          className="comic-btn mt-6 w-full rounded-lg bg-accent px-4 py-3 text-lg text-white sm:w-auto sm:px-8"
        >
          Got it!
        </button>
      </div>
    </div>
  );
}
