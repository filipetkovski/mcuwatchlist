"use client";

import { useApp } from "./app-provider";

export function LockButton() {
  const { status, lock } = useApp();
  if (status !== "unlocked") return null;
  return (
    <button type="button" onClick={() => void lock()} className="comic-btn rounded-md bg-white px-3 py-1.5 text-sm text-black">
      Lock
    </button>
  );
}
