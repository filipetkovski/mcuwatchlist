"use client";

import { AlbumIcon } from "./album-icon";
import { useApp } from "./app-provider";

export function AllbumNotice() {
  const { status, user, dismissAlbumNotice } = useApp();
  if (status !== "unlocked" || !user || user.albumNoticeSeen) return null;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="allbum-notice-title" className="fixed inset-0 z-50 flex items-center justify-center bg-bg/85 p-4 backdrop-blur-md">
      <div className="comic-panel w-full max-w-lg p-8 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-black bg-violet shadow-[3px_3px_0_#000]">
          <AlbumIcon className="h-9 w-9 text-white" />
        </span>
        <h2 id="allbum-notice-title" className="mt-4 font-display text-3xl text-white [text-shadow:2px_2px_0_#000]">
          The Allbum is here!
        </h2>
        <p className="mt-3 text-base text-muted">
          Spend the vibraniums you&apos;ve earned from Tic-Tac-Toe and Draft on Silver, Gold, and Platinum card packs,
          and collect every hero and villain in a stickers album. Head to the Allbum page to start opening packs.
        </p>
        <button
          type="button"
          onClick={dismissAlbumNotice}
          className="comic-btn mt-6 w-full rounded-lg bg-accent px-4 py-3 text-lg text-white sm:w-auto sm:px-8"
        >
          Got it!
        </button>
      </div>
    </div>
  );
}
