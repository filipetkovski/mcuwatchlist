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

  if (user?.role !== "admin") {
    return <p className="text-muted">You don&apos;t have permission to view this page.</p>;
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-muted">All registered accounts.</p>
      </header>

      {error && (
        <p className="rounded-lg border-2 border-black bg-warn px-3 py-2 text-sm font-medium text-black">{error}</p>
      )}

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : (
        <div className="comic-panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-black text-left">
                <th className="px-4 py-3 font-display font-semibold">Username</th>
                <th className="px-4 py-3 font-display font-semibold">Role</th>
                <th className="px-4 py-3 font-display font-semibold">Path</th>
                <th className="px-4 py-3 font-display font-semibold">Status</th>
                <th className="px-4 py-3 font-display font-semibold">Joined</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-surface-2">
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
                  <td colSpan={6} className="px-4 py-6 text-center text-muted">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
