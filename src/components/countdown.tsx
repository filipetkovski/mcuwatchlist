"use client";

import { useSyncExternalStore } from "react";
import { toUTC } from "@/lib/dates";
import { DOOMSDAY_RELEASE } from "@/lib/paths";
import { DoomMask } from "./doom-mask";

const subscribeTick = (callback: () => void) => {
  const id = setInterval(callback, 1000);
  return () => clearInterval(id);
};
const getNow = () => Date.now();
const getServerNow = () => null;

const TARGET_MS = toUTC(DOOMSDAY_RELEASE);
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;

/** Alarm mode: the bell rings when release is this close. */
const ALARM_DAYS = 100;

const pad = (n: number) => String(n).padStart(2, "0");

export function Countdown() {
  const now = useSyncExternalStore(subscribeTick, getNow, getServerNow);
  const remainingMs = now === null ? null : Math.max(TARGET_MS - now, 0);
  const released = remainingMs !== null && remainingMs <= 0;

  const days = remainingMs === null ? null : Math.floor(remainingMs / DAY_MS);
  const hours = remainingMs === null ? null : Math.floor((remainingMs % DAY_MS) / HOUR_MS);
  const minutes = remainingMs === null ? null : Math.floor((remainingMs % HOUR_MS) / MINUTE_MS);
  const seconds = remainingMs === null ? null : Math.floor((remainingMs % MINUTE_MS) / 1000);

  const alarm = days !== null && days <= ALARM_DAYS;

  const units: Array<[string, number | null, boolean]> = [
    ["Days", days, false],
    ["Hours", hours, true],
    ["Min", minutes, true],
    ["Sec", seconds, true],
  ];

  return (
    <div
      className="comic-panel relative w-full overflow-hidden p-3 sm:p-4"
      style={{ background: "linear-gradient(160deg, #1f8a4f 0%, #0f5a33 55%, #08301c 100%)" }}
      role="timer"
      aria-label="Countdown to Avengers: Doomsday"
    >
      <DoomMask className="pointer-events-none absolute -bottom-8 -right-6 h-32 w-auto select-none opacity-25 sm:h-44" />
      <div className="relative flex items-center gap-3 sm:gap-4">
        <svg
          viewBox="0 0 24 24"
          className={`h-8 w-8 shrink-0 text-warn sm:h-10 sm:w-10 ${alarm && !released ? "alarm-ring" : ""}`}
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            stroke="#000"
            strokeWidth="1.2"
            strokeLinejoin="round"
            d="M12 2.5a1.6 1.6 0 0 1 1.6 1.6v.5c2.6.7 4.4 3 4.4 5.8v3.6l1.8 2.8c.4.6 0 1.4-.8 1.4H5c-.8 0-1.2-.8-.8-1.4L6 13.4V9.8c0-2.8 1.8-5.1 4.4-5.8v-.5A1.6 1.6 0 0 1 12 2.5ZM9.8 19h4.4a2.2 2.2 0 0 1-4.4 0Z"
          />
        </svg>
        {released ? (
          <p className="min-w-0 font-display text-2xl text-white sm:text-4xl">In theaters now!</p>
        ) : (
          <p className="min-w-0 font-display text-lg text-white sm:text-2xl">Counting down to Doomsday</p>
        )}
      </div>

      {!released && (
        <div className="mt-3 grid grid-cols-4 gap-2 sm:gap-3">
          {units.map(([label, value, padded]) => (
            <div key={label} className="rounded-lg border-2 border-black bg-black/30 px-1 py-1.5 text-center sm:px-2">
              <div className="font-display text-2xl leading-none tabular-nums text-white [text-shadow:2px_2px_0_#000] sm:text-4xl">
                {value === null ? "--" : padded ? pad(value) : value}
              </div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-white/80 sm:text-xs">{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
