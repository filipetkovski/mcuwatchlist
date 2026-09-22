import { NextResponse, type NextRequest } from "next/server";
import { guard } from "@/lib/session";
import { admin } from "@/lib/supabase/admin";

const PATH_ID = /^[a-z0-9-]{1,64}$/;
const PAGE = 1000;

export async function GET() {
  const g = await guard();
  if (!g.ok) return g.response;
  const db = admin();
  if (!db) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const { userId } = g.session;
  const progress: Record<string, Record<string, string>> = {};
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("path_progress")
      .select("path_id, title_id, watched_at")
      .eq("user_id", userId)
      .order("path_id")
      .order("title_id")
      .range(from, from + PAGE - 1);
    if (error) return NextResponse.json({ error: "Couldn't load progress." }, { status: 500 });
    for (const row of data) (progress[row.path_id] ??= {})[row.title_id] = row.watched_at;
    if (data.length < PAGE) break;
  }
  return NextResponse.json({ progress });
}

export async function POST(req: NextRequest) {
  const g = await guard();
  if (!g.ok) return g.response;
  const db = admin();
  if (!db) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const { userId } = g.session;
  const body = (await req.json().catch(() => null)) as { pathId?: unknown; titleIds?: unknown; watched?: unknown } | null;
  const { pathId, titleIds, watched } = body ?? {};
  if (
    typeof pathId !== "string" ||
    !PATH_ID.test(pathId) ||
    typeof watched !== "boolean" ||
    !Array.isArray(titleIds) ||
    titleIds.length === 0 ||
    titleIds.length > 200 ||
    !titleIds.every((id) => typeof id === "string" && id.length > 0 && id.length <= 100)
  ) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (watched) {
    const rows = (titleIds as string[]).map((title_id) => ({ user_id: userId, path_id: pathId, title_id }));
    const { error } = await db.from("path_progress").upsert(rows, { onConflict: "user_id,path_id,title_id", ignoreDuplicates: true });
    if (error) return NextResponse.json({ error: "Couldn't save." }, { status: 500 });
  } else {
    const { error } = await db
      .from("path_progress")
      .delete()
      .eq("user_id", userId)
      .eq("path_id", pathId)
      .in("title_id", titleIds as string[]);
    if (error) return NextResponse.json({ error: "Couldn't save." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
