import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { guard } from "@/lib/session";
import { admin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
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

  const reqUrl = new URL(req.url);
  const origin = process.env.NEXT_PUBLIC_SITE_URL
    ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")
    : reqUrl.origin;
  return NextResponse.json({ url: `${origin}/register?key=${token}` });
}
