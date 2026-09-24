"use client";

import { useState } from "react";
import type { Title, TitleRating } from "@/lib/types";
import { useApp } from "./app-provider";

export function RateModal({
  title,
  onClose,
  onCancel,
}: {
  title: Title;
  onClose: () => void;
  onCancel: () => void;
}) {
  const { ratingFor, rateTitle } = useApp();
  const rating = ratingFor(title.id);
  const mine = rating.mine;
  const [value, setValue] = useState(mine ?? 3);

  const confirm = () => {
    rateTitle(title.id, Math.round(value * 10) / 10);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/85 p-4 backdrop-blur-md">
      <div role="dialog" aria-modal="true" aria-labelledby="rate-title" className="comic-panel w-full max-w-sm p-6">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1 text-sm font-medium text-muted hover:text-ink"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
          Back
        </button>
        <h2 id="rate-title" className="mt-2 text-center font-display text-2xl text-white [text-shadow:2px_2px_0_#000]">
          Rate it!
        </h2>
        <p className="mt-1 text-center text-base font-semibold text-ink">{title.title}</p>

        <ModalPoster title={title} rating={rating} />

        <div className="mt-6 flex flex-col items-center gap-4">
          <span className="flex items-center gap-2 font-mono text-4xl font-bold tabular-nums">
            <span aria-hidden="true" className="text-yellow-400">★</span>
            {value.toFixed(1)}
          </span>
          <input
            type="range"
            min={1}
            max={5}
            step={0.1}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            aria-label="Your rating, from 1 to 5"
            className="w-full accent-accent"
          />
          <div className="flex w-full justify-between font-mono text-xs text-muted">
            <span>1</span>
            <span>5</span>
          </div>
        </div>

        <button
          type="button"
          onClick={confirm}
          className="comic-btn mt-6 w-full rounded-lg bg-accent px-4 py-2.5 text-base text-white"
        >
          Rate {value.toFixed(1)}
        </button>
      </div>
    </div>
  );
}

function ModalPoster({ title, rating }: { title: Title; rating: TitleRating }) {
  const initials = title.title
    .replace(/[^A-Za-z0-9 ]/g, "")
    .split(" ")
    .filter((w) => w.length > 2 || /^\d/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="relative mx-auto mt-4 h-48 w-32">
      {title.poster_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={title.poster_url}
          alt=""
          className="h-full w-full rounded-lg border-2 border-black object-cover shadow-[3px_3px_0_#000]"
        />
      ) : (
        <div
          aria-hidden="true"
          className="flex h-full w-full items-center justify-center rounded-lg border-2 border-black bg-gradient-to-br from-surface-2 to-line font-display text-2xl font-bold text-muted shadow-[3px_3px_0_#000]"
        >
          {initials || "M"}
        </div>
      )}
      {rating.count === 0 || rating.average === null ? (
        <span
          title="N/A"
          className="absolute right-1 top-1 flex h-5 items-center rounded-full border-2 border-black bg-surface-2 px-1.5 font-mono text-[10px] font-medium text-muted shadow-[2px_2px_0_#000]"
        >
          N/A
        </span>
      ) : (
        <span
          title={`${rating.average.toFixed(1)} average from ${rating.count} rating${rating.count === 1 ? "" : "s"}`}
          className="absolute right-1 top-1 flex h-5 items-center gap-0.5 rounded-full border-2 border-black bg-yellow-400 px-1.5 font-mono text-[10px] font-bold tabular-nums text-black shadow-[2px_2px_0_#000]"
        >
          ★ {rating.average.toFixed(1)}
        </span>
      )}
    </div>
  );
}
