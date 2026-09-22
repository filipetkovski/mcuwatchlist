"use client";

import Link from "next/link";
import { PATHS } from "@/lib/paths";
import { formatHours } from "@/lib/format";
import type { Title } from "@/lib/types";
import { useApp } from "./app-provider";
import { AvengersMask } from "./avengers-mask";
import { DoomMask } from "./doom-mask";
import { IronManMask } from "./iron-man-mask";

export function PathCards({ titles }: { titles: Title[] }) {
  const { watchedFor, user } = useApp();
  const userPathId = user?.pathId ?? null;

  return (
    <ul className="grid gap-4 md:grid-cols-3">
      {PATHS.map((path) => {
        // "new-to-marvel" shows all titles in the watch order (MCU + non-MCU), match that here.
        const list = path.id === "new-to-marvel" ? titles : titles.filter(path.include);
        const watchedMap = watchedFor(path.id);
        const watched = list.filter((t) => t.id in watchedMap).length;
        const minutes = list.reduce((sum, t) => sum + t.runtime_minutes, 0);
        const isSelected = userPathId === path.id;
        const isOther = userPathId !== null && !isSelected;

        const doom = path.id === "prepare-for-doomsday";
        const ironMan = path.id === "new-to-marvel";
        const avengers = path.id === "rewatch-essentials";

        const inner = (
          <>
            {doom && (
              <DoomMask className="pointer-events-none absolute -bottom-6 -right-6 h-72 w-auto select-none opacity-70 drop-shadow-[4px_4px_0_rgba(0,0,0,0.5)]" />
            )}
            {ironMan && (
              <IronManMask className="pointer-events-none absolute -bottom-6 -right-6 h-72 w-auto select-none opacity-70 drop-shadow-[4px_4px_0_rgba(0,0,0,0.5)]" />
            )}
            {avengers && (
              <AvengersMask className="pointer-events-none absolute -bottom-6 -right-6 h-64 w-auto select-none opacity-70 drop-shadow-[4px_4px_0_rgba(0,0,0,0.5)]" />
            )}
            <h3 className="relative font-display text-xl font-semibold">{path.name}</h3>
            <p
              className={`relative mt-1 text-sm font-medium ${
                doom ? "text-[#b8f7cd]" : ironMan ? "text-[#ffcf6b]" : avengers ? "text-[#cfe8ff]" : "text-accent-text"
              }`}
            >
              {path.tagline}
            </p>
            <p className="relative mt-2 flex-1 text-sm text-white/90">{path.description}</p>
            <p className="relative mt-4 text-xs text-white/85">
              {watched} of {list.length} watched · {formatHours(minutes)} total
            </p>
            {isSelected && (
              <span className="relative mt-3 self-start rounded-full border border-white/40 bg-white/20 px-2 py-0.5 text-xs font-medium text-white">
                Your path
              </span>
            )}
          </>
        );

        const cardStyle = doom
          ? { background: "linear-gradient(160deg, #1f8a4f 0%, #0f5a33 55%, #08301c 100%)" }
          : ironMan
            ? { background: "linear-gradient(160deg, #d22030 0%, #8f0d1a 55%, #4a0710 100%)" }
            : avengers
              ? { background: "linear-gradient(160deg, #7cc3ff 0%, #2e6fd9 55%, #123a73 100%)" }
              : undefined;

        const baseClass = "relative flex h-full flex-col overflow-hidden comic-panel p-5";

        if (isOther) {
          return (
            <li key={path.id}>
              <div
                className={`${baseClass} opacity-40 grayscale`}
                style={cardStyle}
                aria-disabled="true"
              >
                {inner}
              </div>
            </li>
          );
        }

        return (
          <li key={path.id}>
            <Link
              href="/watch-order/story"
              className={`${baseClass} transition-transform hover:-translate-y-0.5`}
              style={cardStyle}
            >
              {inner}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
