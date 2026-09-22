"use client";

import { useApp } from "./app-provider";

export function LockButton() {
  const { status, user, lock } = useApp();
  if (status !== "unlocked") return null;
  return (
    <div className="flex items-center gap-2">
      {user && <span className="hidden text-base font-semibold text-white sm:block">{user.username}</span>}
      <button type="button" onClick={() => void lock()} className="comic-btn rounded-md bg-white px-3 py-1.5 text-sm text-black">
        Sign out
      </button>
    </div>
  );
}
