"use client";

import { useApp } from "./app-provider";

export function RatingsNotice() {
  const { status, user, dismissRatingsNotice } = useApp();
  if (status !== "unlocked" || !user || user.ratingsNoticeSeen) return null;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="ratings-notice-title" className="fixed inset-0 z-50 flex items-center justify-center bg-bg/85 p-4 backdrop-blur-md">
      <div className="comic-panel w-full max-w-lg p-8 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-black bg-yellow-400 text-4xl shadow-[3px_3px_0_#000]">
          ⭐
        </span>
        <h2 id="ratings-notice-title" className="mt-4 font-display text-3xl text-white [text-shadow:2px_2px_0_#000]">
          You can rate movies now!
        </h2>
        <p className="mt-3 text-base text-muted">
          Check a movie off your list and a popup will let you rate it right away. Already watched something? Look
          for the <span className="font-display tracking-wide text-ink">Rate</span> button on its row to rate it too.
        </p>
        <button
          type="button"
          onClick={dismissRatingsNotice}
          className="comic-btn mt-6 w-full rounded-lg bg-accent px-4 py-3 text-lg text-white sm:w-auto sm:px-8"
        >
          Got it!
        </button>
      </div>
    </div>
  );
}
