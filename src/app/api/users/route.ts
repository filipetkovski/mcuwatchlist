import { NextResponse, type NextRequest } from "next/server";
import { hashPassword } from "@/lib/password";
import { guard } from "@/lib/session";
import { admin } from "@/lib/supabase/admin";
import { SHARED_PROGRESS_KEY, titlesForScope } from "@/lib/paths";
import { getTitles } from "@/lib/titles";
import type { PathId, UserRole } from "@/lib/types";

const PAGE = 1000;

export async function GET() {
  const g = await guard();
  if (!g.ok) return g.response;
  if (g.session.role !== "admin") {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  const db = admin();
  if (!db) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const { data, error } = await db
    .from("users")
    .select("id, username, role, path_id, created_at")
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: "Couldn't load users." }, { status: 500 });

  const userIds = data.map((u) => u.id);
  const titles = await getTitles();

  // Built-in paths share one progress key, so a user's watched titles are intersected with the
  // titles in their chosen path's scope.
  const watchedByUser = new Map<string, Set<string>>();
  if (userIds.length > 0) {
    for (let from = 0; ; from += PAGE) {
      const { data: rows, error: progError } = await db
        .from("path_progress")
        .select("user_id, title_id")
        .in("user_id", userIds)
        .eq("path_id", SHARED_PROGRESS_KEY)
        .order("user_id")
        .order("title_id")
        .range(from, from + PAGE - 1);
      if (progError) return NextResponse.json({ error: "Couldn't load progress." }, { status: 500 });
      for (const row of rows) {
        let set = watchedByUser.get(row.user_id);
        if (!set) watchedByUser.set(row.user_id, (set = new Set()));
        set.add(row.title_id);
      }
      if (rows.length < PAGE) break;
    }
  }

  const albumCounts = new Map<string, number>();
  if (userIds.length > 0) {
    for (let from = 0; ; from += PAGE) {
      const { data: rows, error: albumError } = await db
        .from("album_cards")
        .select("user_id, character_id")
        .in("user_id", userIds)
        .gt("count", 0)
        .order("user_id")
        .order("character_id")
        .range(from, from + PAGE - 1);
      if (albumError) return NextResponse.json({ error: "Couldn't load albums." }, { status: 500 });
      for (const row of rows) albumCounts.set(row.user_id, (albumCounts.get(row.user_id) ?? 0) + 1);
      if (rows.length < PAGE) break;
    }
  }

  const plannerNames = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: rows, error: schedError } = await db.from("schedules").select("user_id, name").in("user_id", userIds);
    if (schedError) return NextResponse.json({ error: "Couldn't load planners." }, { status: 500 });
    for (const row of rows) plannerNames.set(row.user_id, row.name);
  }

  const scopeTitleIds = new Map<string, Set<string>>();
  const users = data.map((u) => {
    const extra = { album_cards: albumCounts.get(u.id) ?? 0, planner: plannerNames.get(u.id) ?? null };
    if (!u.path_id) return { ...u, ...extra, watched: null, total: null };
    let ids = scopeTitleIds.get(u.path_id);
    if (!ids) {
      ids = new Set(titlesForScope(titles, u.path_id as PathId).map((t) => t.id));
      scopeTitleIds.set(u.path_id, ids);
    }
    const watchedSet = watchedByUser.get(u.id);
    let watched = 0;
    if (watchedSet) for (const id of watchedSet) if (ids.has(id)) watched++;
    return { ...u, ...extra, watched, total: ids.size };
  });

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const g = await guard();
  if (!g.ok) return g.response;
  if (g.session.role !== "admin") {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  const db = admin();
  if (!db) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const body = (await req.json().catch(() => null)) as { username?: unknown; password?: unknown; role?: unknown } | null;
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const role: UserRole = body?.role === "admin" ? "admin" : "user";

  if (!username || username.length > 50 || !password || password.length > 200) {
    return NextResponse.json({ error: "Invalid username or password." }, { status: 400 });
  }

  const { data, error } = await db
    .from("users")
    .insert({ username, password_hash: hashPassword(password), role })
    .select("id, username, role")
    .single();
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Username already taken." }, { status: 409 });
    return NextResponse.json({ error: "Couldn't create user." }, { status: 500 });
  }
  return NextResponse.json({ user: data }, { status: 201 });
}
