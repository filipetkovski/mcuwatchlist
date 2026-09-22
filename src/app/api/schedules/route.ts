import { NextResponse, type NextRequest } from "next/server";
import { parseSchedule, scheduleColumns } from "@/lib/schedule-validation";
import { guard } from "@/lib/session";
import { admin } from "@/lib/supabase/admin";
import type { GeneratedSchedule } from "@/lib/types";

const toClient = (row: { id: string; name: string; created_at: string; generated_schedule: GeneratedSchedule }) => ({
  id: row.id,
  name: row.name,
  created_at: row.created_at,
  schedule: row.generated_schedule,
});

export async function GET() {
  const g = await guard();
  if (!g.ok) return g.response;
  const db = admin();
  if (!db) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const { data, error } = await db
    .from("schedules")
    .select("id, name, created_at, generated_schedule")
    .eq("user_id", g.session.userId)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: "Couldn't load schedules." }, { status: 500 });
  return NextResponse.json({ schedules: data.map(toClient) });
}

/** Body: { name, schedule } — replaces any existing schedule for this user. */
export async function POST(req: NextRequest) {
  const g = await guard();
  if (!g.ok) return g.response;
  const db = admin();
  if (!db) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const { userId } = g.session;
  const body = (await req.json().catch(() => null)) as { name?: unknown; schedule?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const schedule = parseSchedule(body?.schedule);
  if (name.length < 1 || name.length > 60 || !schedule) return NextResponse.json({ error: "Invalid schedule." }, { status: 400 });

  // Delete existing schedule for this user (one per user constraint).
  await db.from("schedules").delete().eq("user_id", userId);

  const { data, error } = await db
    .from("schedules")
    .insert({ user_id: userId, name, ...scheduleColumns(schedule) })
    .select("id, name, created_at, generated_schedule")
    .single();
  if (error) return NextResponse.json({ error: "Couldn't save the schedule." }, { status: 500 });
  return NextResponse.json({ schedule: toClient(data) }, { status: 201 });
}
