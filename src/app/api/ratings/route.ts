import { NextResponse, type NextRequest } from "next/server";
import { guard } from "@/lib/session";
import { admin } from "@/lib/supabase/admin";
import type { RatingsMap } from "@/lib/types";

const PAGE = 1000;

export async function GET() {
  const g = await guard();
  if (!g.ok) return g.response;
  const db = admin();
  if (!db) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const { userId } = g.session;
  const sums: Record<string, { total: number; count: number; mine: number | null }> = {};
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("title_ratings")
      .select("user_id, title_id, rating")
      .range(from, from + PAGE - 1);
    if (error) return NextResponse.json({ error: "Couldn't load ratings." }, { status: 500 });
    for (const row of data) {
      const entry = (sums[row.title_id] ??= { total: 0, count: 0, mine: null });
      entry.total += row.rating;
      entry.count += 1;
      if (row.user_id === userId) entry.mine = row.rating;
    }
    if (data.length < PAGE) break;
  }

  const ratings: RatingsMap = {};
  for (const [titleId, { total, count, mine }] of Object.entries(sums)) {
    ratings[titleId] = { average: count > 0 ? total / count : null, count, mine };
  }
  return NextResponse.json({ ratings });
}

export async function POST(req: NextRequest) {
  const g = await guard();
  if (!g.ok) return g.response;
  const db = admin();
  if (!db) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const { userId } = g.session;
  const body = (await req.json().catch(() => null)) as { titleId?: unknown; rating?: unknown } | null;
  const titleId = typeof body?.titleId === "string" ? body.titleId : "";
  const rating = body?.rating ?? null;
  if (!titleId || titleId.length > 100) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (rating === null) {
    const { error } = await db.from("title_ratings").delete().eq("user_id", userId).eq("title_id", titleId);
    if (error) return NextResponse.json({ error: "Couldn't save." }, { status: 500 });
  } else {
    if (typeof rating !== "number" || !Number.isFinite(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const rounded = Math.round(rating * 10) / 10;
    const { error } = await db
      .from("title_ratings")
      .upsert({ user_id: userId, title_id: titleId, rating: rounded }, { onConflict: "user_id,title_id" });
    if (error) return NextResponse.json({ error: "Couldn't save." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
