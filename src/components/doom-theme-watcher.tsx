"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { PATH_QUERY_EVENT } from "@/lib/path-event";

/**
 * Toggles `.doom-active` on <html> when the Doomsday path is selected on a watch-order page, so the
 * header/footer/background dots (styled in globals.css) can react without becoming client components
 * themselves. `usePathname` catches real route changes; the window event catches title-explorer's
 * in-page `history.replaceState` (which bypasses Next's router, so usePathname alone won't see it).
 */
export function DoomThemeWatcher() {
  const pathname = usePathname();

  useEffect(() => {
    const sync = () => {
      const onWatchOrder = pathname?.startsWith("/watch-order") ?? false;
      const path = onWatchOrder ? new URLSearchParams(window.location.search).get("path") : null;
      document.documentElement.classList.toggle("doom-active", path === "prepare-for-doomsday");
    };
    sync();
    window.addEventListener("popstate", sync);
    window.addEventListener(PATH_QUERY_EVENT, sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener(PATH_QUERY_EVENT, sync);
    };
  }, [pathname]);

  return null;
}
