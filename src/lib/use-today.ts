"use client";

import { useSyncExternalStore } from "react";
import { todayISO } from "./dates";

const subscribe = () => () => {};
const serverSnapshot = () => null;

/** Local calendar date; null during SSR/hydration so server and client markup agree. */
export function useToday(): string | null {
  return useSyncExternalStore(subscribe, todayISO, serverSnapshot);
}
