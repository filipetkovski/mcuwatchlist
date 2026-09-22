"use client";

import { useApp } from "./app-provider";

export function ProgressNotices() {
  const { error, clearError } = useApp();
  if (!error) return null;
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border-2 border-black bg-warn px-4 py-3 text-sm font-medium text-black">
      <p className="flex-1">{error}</p>
      <button type="button" onClick={clearError} aria-label="Dismiss" className="font-bold">
        ✕
      </button>
    </div>
  );
}
