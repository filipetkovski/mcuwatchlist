import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { guard } from "@/lib/session";
import { admin } from "@/lib/supabase/admin";

export async function POST() {
  const g = await guard();
  if (!g.ok) return g.response;
  if (g.session.role !== "admin") {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  const db = admin();
  if (!db) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const token = randomBytes(24).toString("base64url");
  const { error } = await db.from("invite_tokens").insert({ token, created_by: g.session.userId });
  if (error) return NextResponse.json({ error: "Couldn't generate invite." }, { status: 500 });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return NextResponse.json({ url: `${siteUrl}/register?key=${token}` });
}
