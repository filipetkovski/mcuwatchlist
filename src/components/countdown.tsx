"use client";

import { useSyncExternalStore } from "react";
import { diffDays, todayISO } from "@/lib/dates";
import { DOOMSDAY_RELEASE } from "@/lib/paths";

const noopSubscribe = () => () => {};
const daysLeft = () => diffDays(todayISO(), DOOMSDAY_RELEASE);
const serverDays = () => null;

/** The bar fills over this many days leading up to release. */
const WINDOW_DAYS = 180;
const SEGMENTS = 30;
/** Alarm mode: the bell rings and the leading segment flashes. */
const ALARM_DAYS = 100;

export function Countdown() {
  const days = useSyncExternalStore(noopSubscribe, daysLeft, serverDays);
  const released = days !== null && days <= 0;
  const remaining = days === null ? WINDOW_DAYS : Math.min(Math.max(days, 0), WINDOW_DAYS);
  const filled = Math.round(((WINDOW_DAYS - remaining) / WINDOW_DAYS) * SEGMENTS);
  const alarm = days !== null && days <= ALARM_DAYS;

  return (
    <div className="comic-panel w-full bg-accent p-3 sm:p-4" role="timer" aria-label="Countdown to Avengers: Doomsday">
      <div className="flex items-center gap-3 sm:gap-4">
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
        <div className="min-w-0 flex-1">
          {released ? (
            <p className="font-display text-2xl text-white sm:text-4xl">In theaters now!</p>
          ) : (
            <p className="flex items-baseline gap-2 text-white">
              <span className="font-display text-3xl leading-none tabular-nums [text-shadow:2px_2px_0_#000] sm:text-5xl">
                {days ?? "--"}
              </span>
              <span className="font-display text-xl sm:text-2xl">days to go</span>
            </p>
          )}
        </div>
      </div>

      <div
        className="mt-2 flex h-5 gap-[3px] rounded-md border-[3px] border-black bg-black p-[3px] sm:h-6"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round((filled / SEGMENTS) * 100)}
        aria-label="Progress toward release"
      >
        {Array.from({ length: SEGMENTS }, (_, i) => {
          const on = i < filled;
          const leading = alarm && !released && i === filled - 1;
          return (
            <span
              key={i}
              className={`flex-1 rounded-[2px] ${on ? "bg-warn" : "bg-white/15"} ${leading ? "alarm-blink" : ""}`}
            />
          );
        })}
      </div>

      <p className="mt-1.5 flex justify-between text-xs font-semibold uppercase tracking-wide text-white/90">
        <span>Now</span>
        <span>Avengers: Doomsday · Dec 18, 2026</span>
      </p>
    </div>
  );
}
