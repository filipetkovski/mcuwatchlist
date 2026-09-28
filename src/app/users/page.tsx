"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/app-provider";
import { getPath } from "@/lib/paths";
import type { PathId } from "@/lib/types";

const PATH_ABBR: Record<PathId, string> = {
  "new-to-marvel": "NTM",
  "prepare-for-doomsday": "PFD",
  "rewatch-essentials": "RE",
};

const PAGE_SIZE = 10;

interface User {
  id: string;
  username: string;
  role: string;
  path_id: string | null;
  created_at: string;
  watched: number | null;
  total: number | null;
}

export default function UsersPage() {
  const { user } = useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [deletingLinks, setDeletingLinks] = useState(false);
  const [linksMessage, setLinksMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((d: { users?: User[]; error?: string }) => {
        if (d.users) setUsers(d.users);
        else setError(d.error ?? "Couldn't load users.");
      })
      .catch(() => setError("Couldn't load users."))
      .finally(() => setLoading(false));
  }, []);

  const deleteUser = async (id: string, username: string) => {
    if (!window.confirm(`Delete user "${username}"? This removes all their progress and schedule.`)) return;
    setDeleting(id);
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) { setError(data.error ?? "Couldn't delete user."); setDeleting(null); return; }
    setUsers((cur) => cur.filter((u) => u.id !== id));
    setDeleting(null);
  };

  const deleteUnusedLinks = async () => {
    if (!window.confirm("Delete every invite link that hasn't been used yet?")) return;
    setDeletingLinks(true);
    setLinksMessage(null);
    const res = await fetch("/api/invite", { method: "DELETE" });
    const data = (await res.json().catch(() => ({}))) as { deleted?: number; error?: string };
    if (!res.ok) setError(data.error ?? "Couldn't delete unused links.");
    else setLinksMessage(data.deleted === 1 ? "Deleted 1 unused link." : `Deleted ${data.deleted ?? 0} unused links.`);
    setDeletingLinks(false);
  };

  if (user?.role !== "admin") {
    return <p className="text-muted">You don&apos;t have permission to view this page.</p>;
  }

  const pageCount = Math.max(Math.ceil(users.length / PAGE_SIZE), 1);
  const currentPage = Math.min(page, pageCount - 1);
  const pageUsers = users.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted">All registered accounts.</p>
        </div>
        <button
          type="button"
          onClick={() => void deleteUnusedLinks()}
          disabled={deletingLinks}
          className="rounded-lg border-2 border-black bg-surface-2 px-3 py-1.5 text-sm hover:bg-surface disabled:opacity-60"
        >
          {deletingLinks ? "Deleting…" : "Delete Unused Links"}
        </button>
      </header>

      {error && (
        <p className="rounded-lg border-2 border-black bg-warn px-3 py-2 text-sm font-medium text-black">{error}</p>
      )}
      {linksMessage && (
        <p className="rounded-lg border-2 border-black bg-good px-3 py-2 text-sm font-medium text-black">{linksMessage}</p>
      )}

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : (
        <div className="comic-panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-black text-left">
                <th className="px-4 py-3 font-display font-semibold">#</th>
                <th className="px-4 py-3 font-display font-semibold">Username</th>
                <th className="px-4 py-3 font-display font-semibold">Role</th>
                <th className="px-4 py-3 font-display font-semibold">Path</th>
                <th className="px-4 py-3 font-display font-semibold">Status</th>
                <th className="px-4 py-3 font-display font-semibold">Joined</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {pageUsers.map((u, i) => (
                <tr key={u.id} className="hover:bg-surface-2">
                  <td className="px-4 py-3 text-muted tabular-nums">{currentPage * PAGE_SIZE + i + 1}</td>
                  <td className="px-4 py-3 font-medium">
                    {u.username}
                    {u.id === user?.id && <span className="ml-2 text-xs text-muted">(you)</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium border ${u.role === "admin" ? "border-accent bg-accent/20 text-accent-text" : "border-line text-muted"}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {u.path_id ? (
                      <span title={getPath(u.path_id)?.name ?? u.path_id}>
                        {PATH_ABBR[u.path_id as PathId] ?? u.path_id}
                      </span>
                    ) : (
                      <span className="italic">not chosen</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {u.total ? (
                      <span title={`${u.watched} watched, ${u.total - (u.watched ?? 0)} left`}>
                        {u.watched}/{u.total} watched
                      </span>
                    ) : (
                      <span className="italic">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    {u.id !== user?.id && (
                      <button
                        type="button"
                        onClick={() => void deleteUser(u.id, u.username)}
                        disabled={deleting === u.id}
                        className="rounded-md border-2 border-black px-3 py-1 text-xs font-medium text-muted hover:border-red-500 hover:text-red-500 disabled:opacity-40"
                      >
                        {deleting === u.id ? "Deleting…" : "Delete"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && pageCount > 1 && (
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(p - 1, 0))}
            disabled={currentPage === 0}
            aria-label="Previous 10 users"
            className="comic-btn flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-x-0 disabled:hover:translate-y-0"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path d="m15 5-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <p className="text-sm text-muted">
            Page {currentPage + 1} of {pageCount}
          </p>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(p + 1, pageCount - 1))}
            disabled={currentPage >= pageCount - 1}
            aria-label="Next 10 users"
            className="comic-btn flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-x-0 disabled:hover:translate-y-0"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
