"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { GeneratedSchedule, SavedSchedule, WatchedMap } from "@/lib/types";

type Status = "checking" | "locked" | "unlocked" | "unconfigured";

interface AppContextValue {
  status: Status;
  unlock: (password: string) => Promise<string | null>;
  lock: () => Promise<void>;
  /** Progress and schedules have loaded from the server. */
  dataReady: boolean;
  isWatched: (pathId: string, titleId: string) => boolean;
  watchedFor: (pathId: string) => WatchedMap;
  setWatched: (pathId: string, titleIds: string[], watched: boolean) => void;
  schedules: SavedSchedule[];
  saveSchedule: (name: string, schedule: GeneratedSchedule) => Promise<SavedSchedule | null>;
  updateSchedule: (id: string, schedule: GeneratedSchedule) => Promise<boolean>;
  deleteSchedule: (id: string) => Promise<boolean>;
  error: string | null;
  clearError: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}

const NO_PROGRESS: WatchedMap = Object.freeze({}) as WatchedMap;

class LockedError extends Error {}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("checking");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [progress, setProgress] = useState<Record<string, WatchedMap>>({});
  const [schedules, setSchedules] = useState<SavedSchedule[]>([]);
  const [dataReady, setDataReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const relock = useCallback(() => {
    setStatus("locked");
    setExpiresAt(null);
    setProgress({});
    setSchedules([]);
    setDataReady(false);
  }, []);

  const api = useCallback(
    async <T,>(url: string, init?: RequestInit): Promise<T> => {
      const res = await fetch(url, {
        ...init,
        headers: init?.body ? { "Content-Type": "application/json" } : undefined,
      });
      if (res.status === 401) {
        relock();
        throw new LockedError();
      }
      const data = (await res.json().catch(() => ({}))) as T & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      return data;
    },
    [relock],
  );

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch("/api/session");
      const data = (await res.json()) as { configured: boolean; authenticated: boolean; expiresAt: number | null };
      if (!data.configured) setStatus("unconfigured");
      else if (data.authenticated) {
        setStatus("unlocked");
        setExpiresAt(data.expiresAt);
      } else relock();
    } catch {
      setStatus("unconfigured");
    }
  }, [relock]);

  useEffect(() => {
    const id = window.setTimeout(() => void checkSession(), 0);
    return () => window.clearTimeout(id);
  }, [checkSession]);

  const loadData = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([
        api<{ progress: Record<string, WatchedMap> }>("/api/progress"),
        api<{ schedules: SavedSchedule[] }>("/api/schedules"),
      ]);
      setProgress(p.progress);
      setSchedules(s.schedules);
      setDataReady(true);
    } catch (e) {
      if (!(e instanceof LockedError)) setError("Couldn't load your saved progress.");
    }
  }, [api]);

  useEffect(() => {
    if (status !== "unlocked") return;
    const id = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(id);
  }, [status, loadData]);

  // Lock the moment the 1-hour session ends, and re-check when the tab comes back into view.
  useEffect(() => {
    if (status !== "unlocked" || expiresAt === null) return;
    const timer = window.setTimeout(relock, Math.max(expiresAt - Date.now(), 0));
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() >= expiresAt) relock();
      else void loadData();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [status, expiresAt, relock, loadData]);

  const unlock = useCallback(async (password: string): Promise<string | null> => {
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; expiresAt?: number };
      if (!res.ok) return data.error ?? "Couldn't unlock.";
      setExpiresAt(data.expiresAt ?? null);
      setStatus("unlocked");
      return null;
    } catch {
      return "Couldn't reach the server.";
    }
  }, []);

  const lock = useCallback(async () => {
    await fetch("/api/session", { method: "DELETE" }).catch(() => {});
    relock();
  }, [relock]);

  const setWatched = useCallback(
    (pathId: string, titleIds: string[], watched: boolean) => {
      if (titleIds.length === 0) return;
      const previous = progress[pathId] ?? NO_PROGRESS;
      const now = new Date().toISOString();
      const next: WatchedMap = { ...previous };
      for (const id of titleIds) {
        if (watched) next[id] ??= now;
        else delete next[id];
      }
      setProgress((cur) => ({ ...cur, [pathId]: next }));

      api("/api/progress", { method: "POST", body: JSON.stringify({ pathId, titleIds, watched }) }).catch((e) => {
        if (e instanceof LockedError) return;
        setProgress((cur) => ({ ...cur, [pathId]: previous }));
        setError("Couldn't save that change. Check your connection and try again.");
      });
    },
    [api, progress],
  );

  const saveSchedule = useCallback(
    async (name: string, schedule: GeneratedSchedule) => {
      try {
        const { schedule: created } = await api<{ schedule: SavedSchedule }>("/api/schedules", {
          method: "POST",
          body: JSON.stringify({ name, schedule }),
        });
        setSchedules((cur) => [...cur, created]);
        return created;
      } catch (e) {
        if (!(e instanceof LockedError)) setError(e instanceof Error ? e.message : "Couldn't save the schedule.");
        return null;
      }
    },
    [api],
  );

  const updateSchedule = useCallback(
    async (id: string, schedule: GeneratedSchedule) => {
      try {
        await api(`/api/schedules/${id}`, { method: "PATCH", body: JSON.stringify({ schedule }) });
        setSchedules((cur) => cur.map((s) => (s.id === id ? { ...s, schedule } : s)));
        return true;
      } catch (e) {
        if (!(e instanceof LockedError)) setError(e instanceof Error ? e.message : "Couldn't update the schedule.");
        return false;
      }
    },
    [api],
  );

  const deleteSchedule = useCallback(
    async (id: string) => {
      try {
        await api(`/api/schedules/${id}`, { method: "DELETE" });
        setSchedules((cur) => cur.filter((s) => s.id !== id));
        setProgress((cur) => {
          const rest = { ...cur };
          delete rest[id];
          return rest;
        });
        return true;
      } catch (e) {
        if (!(e instanceof LockedError)) setError(e instanceof Error ? e.message : "Couldn't delete the schedule.");
        return false;
      }
    },
    [api],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      status,
      unlock,
      lock,
      dataReady,
      isWatched: (pathId, titleId) => titleId in (progress[pathId] ?? NO_PROGRESS),
      watchedFor: (pathId) => progress[pathId] ?? NO_PROGRESS,
      setWatched,
      schedules,
      saveSchedule,
      updateSchedule,
      deleteSchedule,
      error,
      clearError: () => setError(null),
    }),
    [status, unlock, lock, dataReady, progress, setWatched, schedules, saveSchedule, updateSchedule, deleteSchedule, error],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
