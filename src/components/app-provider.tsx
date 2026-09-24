"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { GeneratedSchedule, PathId, RatingsMap, SavedSchedule, TitleRating, UserRole, WatchedMap } from "@/lib/types";

type Status = "checking" | "locked" | "path-pending" | "unlocked" | "unconfigured";

interface User {
  id: string;
  username: string;
  role: UserRole;
  pathId: PathId | null;
  ratingsNoticeSeen: boolean;
  ticTacToeNoticeSeen: boolean;
}

interface AppContextValue {
  status: Status;
  user: User | null;
  login: (username: string, password: string) => Promise<string | null>;
  selectPath: (pathId: PathId) => Promise<string | null>;
  lock: () => Promise<void>;
  dataReady: boolean;
  isWatched: (pathId: string, titleId: string) => boolean;
  watchedFor: (pathId: string) => WatchedMap;
  setWatched: (pathId: string, titleIds: string[], watched: boolean) => void;
  ratingFor: (titleId: string) => TitleRating;
  rateTitle: (titleId: string, rating: number | null) => void;
  dismissRatingsNotice: () => void;
  dismissTicTacToeNotice: () => void;
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
const NO_RATING: TitleRating = Object.freeze({ average: null, count: 0, mine: null });

class LockedError extends Error {}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("checking");
  const [user, setUser] = useState<User | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [progress, setProgress] = useState<Record<string, WatchedMap>>({});
  const [ratings, setRatings] = useState<RatingsMap>({});
  const [schedules, setSchedules] = useState<SavedSchedule[]>([]);
  const [dataReady, setDataReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const relock = useCallback(() => {
    setStatus("locked");
    setUser(null);
    setExpiresAt(null);
    setProgress({});
    setRatings({});
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
      const data = (await res.json()) as {
        configured: boolean;
        authenticated: boolean;
        userId?: string;
        username?: string;
        role?: UserRole;
        pathId?: PathId | null;
        ratingsNoticeSeen?: boolean;
        ticTacToeNoticeSeen?: boolean;
        expiresAt?: number | null;
      };
      if (!data.configured) {
        setStatus("unconfigured");
      } else if (data.authenticated && data.userId && data.username && data.role) {
        const u: User = {
          id: data.userId,
          username: data.username,
          role: data.role,
          pathId: data.pathId ?? null,
          ratingsNoticeSeen: data.ratingsNoticeSeen ?? false,
          ticTacToeNoticeSeen: data.ticTacToeNoticeSeen ?? false,
        };
        setUser(u);
        setExpiresAt(data.expiresAt ?? null);
        setStatus(u.pathId ? "unlocked" : "path-pending");
      } else {
        relock();
      }
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
      const [p, s, r] = await Promise.all([
        api<{ progress: Record<string, WatchedMap> }>("/api/progress"),
        api<{ schedules: SavedSchedule[] }>("/api/schedules"),
        api<{ ratings: RatingsMap }>("/api/ratings"),
      ]);
      setProgress(p.progress);
      setSchedules(s.schedules);
      setRatings(r.ratings);
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

  useEffect(() => {
    if ((status !== "unlocked" && status !== "path-pending") || expiresAt === null) return;
    const timer = window.setTimeout(relock, Math.max(expiresAt - Date.now(), 0));
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() >= expiresAt) relock();
      else if (status === "unlocked") void loadData();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [status, expiresAt, relock, loadData]);

  const login = useCallback(async (username: string, password: string): Promise<string | null> => {
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        userId?: string;
        username?: string;
        role?: UserRole;
        pathId?: PathId | null;
        ratingsNoticeSeen?: boolean;
        ticTacToeNoticeSeen?: boolean;
        expiresAt?: number;
      };
      if (!res.ok) return data.error ?? "Couldn't log in.";
      if (!data.userId || !data.username || !data.role) return "Unexpected server response.";
      const u: User = {
        id: data.userId,
        username: data.username,
        role: data.role,
        pathId: data.pathId ?? null,
        ratingsNoticeSeen: data.ratingsNoticeSeen ?? false,
        ticTacToeNoticeSeen: data.ticTacToeNoticeSeen ?? false,
      };
      setUser(u);
      setExpiresAt(data.expiresAt ?? null);
      setStatus(u.pathId ? "unlocked" : "path-pending");
      return null;
    } catch {
      return "Couldn't reach the server.";
    }
  }, []);

  const selectPath = useCallback(async (pathId: PathId): Promise<string | null> => {
    try {
      const res = await fetch("/api/session/path", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pathId }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; expiresAt?: number };
      if (!res.ok) return data.error ?? "Couldn't save path.";
      setUser((u) => u ? { ...u, pathId } : u);
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

  const rateTitle = useCallback(
    (titleId: string, rating: number | null) => {
      const previous = ratings[titleId] ?? NO_RATING;
      const mineBefore = previous.mine;
      let totalBefore = (previous.average ?? 0) * previous.count;
      if (mineBefore !== null) totalBefore -= mineBefore;
      const countAfter = previous.count - (mineBefore !== null ? 1 : 0) + (rating !== null ? 1 : 0);
      const totalAfter = totalBefore + (rating ?? 0);
      const next: TitleRating = { average: countAfter > 0 ? totalAfter / countAfter : null, count: countAfter, mine: rating };
      setRatings((cur) => ({ ...cur, [titleId]: next }));

      api("/api/ratings", { method: "POST", body: JSON.stringify({ titleId, rating }) }).catch((e) => {
        if (e instanceof LockedError) return;
        setRatings((cur) => ({ ...cur, [titleId]: previous }));
        setError("Couldn't save that rating. Check your connection and try again.");
      });
    },
    [api, ratings],
  );

  const dismissRatingsNotice = useCallback(() => {
    setUser((u) => (u ? { ...u, ratingsNoticeSeen: true } : u));
    api("/api/session/rating-notice", { method: "POST" }).catch(() => {});
  }, [api]);

  const dismissTicTacToeNotice = useCallback(() => {
    setUser((u) => (u ? { ...u, ticTacToeNoticeSeen: true } : u));
    api("/api/session/tic-tac-toe-notice", { method: "POST" }).catch(() => {});
  }, [api]);

  const saveSchedule = useCallback(
    async (name: string, schedule: GeneratedSchedule) => {
      try {
        const { schedule: created } = await api<{ schedule: SavedSchedule }>("/api/schedules", {
          method: "POST",
          body: JSON.stringify({ name, schedule }),
        });
        setSchedules([created]);
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
        setSchedules([]);
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
      user,
      login,
      selectPath,
      lock,
      dataReady,
      isWatched: (pathId, titleId) => titleId in (progress[pathId] ?? NO_PROGRESS),
      watchedFor: (pathId) => progress[pathId] ?? NO_PROGRESS,
      setWatched,
      ratingFor: (titleId) => ratings[titleId] ?? NO_RATING,
      rateTitle,
      dismissRatingsNotice,
      dismissTicTacToeNotice,
      schedules,
      saveSchedule,
      updateSchedule,
      deleteSchedule,
      error,
      clearError: () => setError(null),
    }),
    [
      status,
      user,
      login,
      selectPath,
      lock,
      dataReady,
      progress,
      setWatched,
      ratings,
      rateTitle,
      dismissRatingsNotice,
      dismissTicTacToeNotice,
      schedules,
      saveSchedule,
      updateSchedule,
      deleteSchedule,
      error,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
