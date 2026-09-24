import { NextResponse, type NextRequest } from "next/server";
import { hashPassword } from "@/lib/password";
import { guard } from "@/lib/session";
import { admin } from "@/lib/supabase/admin";
import { titlesForScope } from "@/lib/paths";
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
  const pathIds = [...new Set(data.map((u) => u.path_id).filter((p): p is string => !!p))];

  const watchedCounts: Record<string, number> = {};
  if (userIds.length > 0 && pathIds.length > 0) {
    for (let from = 0; ; from += PAGE) {
      const { data: rows, error: progError } = await db
        .from("path_progress")
        .select("user_id, path_id, title_id")
        .in("user_id", userIds)
        .in("path_id", pathIds)
        .range(from, from + PAGE - 1);
      if (progError) return NextResponse.json({ error: "Couldn't load progress." }, { status: 500 });
      for (const row of rows) {
        const key = `${row.user_id}:${row.path_id}`;
        watchedCounts[key] = (watchedCounts[key] ?? 0) + 1;
      }
      if (rows.length < PAGE) break;
    }
  }

  const titles = await getTitles();
  const totalsByPath = new Map<string, number>();

  const users = data.map((u) => {
    if (!u.path_id) return { ...u, watched: null, total: null };
    let total = totalsByPath.get(u.path_id);
    if (total === undefined) {
      total = titlesForScope(titles, u.path_id as PathId).length;
      totalsByPath.set(u.path_id, total);
    }
    const watched = watchedCounts[`${u.id}:${u.path_id}`] ?? 0;
    return { ...u, watched, total };
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
