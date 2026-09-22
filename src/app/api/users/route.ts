import { NextResponse, type NextRequest } from "next/server";
import { hashPassword } from "@/lib/password";
import { guard } from "@/lib/session";
import { admin } from "@/lib/supabase/admin";
import type { UserRole } from "@/lib/types";

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
  return NextResponse.json({ users: data });
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
