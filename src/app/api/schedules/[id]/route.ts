import { NextResponse, type NextRequest } from "next/server";
import { parseSchedule, scheduleColumns } from "@/lib/schedule-validation";
import { guard } from "@/lib/session";
import { admin } from "@/lib/supabase/admin";
import type { GeneratedSchedule } from "@/lib/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Ctx = { params: Promise<{ id: string }> };

/** Body: { name?, schedule? } */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const denied = await guard();
  if (denied) return denied;
  const db = admin();
  if (!db) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const { id } = await ctx.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Invalid id." }, { status: 400 });

  const body = (await req.json().catch(() => null)) as { name?: unknown; schedule?: unknown } | null;
  const update: Record<string, unknown> = {};

  if (body?.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (name.length < 1 || name.length > 60) return NextResponse.json({ error: "Invalid name." }, { status: 400 });
    update.name = name;
  }
  if (body?.schedule !== undefined) {
    const schedule: GeneratedSchedule | null = parseSchedule(body.schedule);
    if (!schedule) return NextResponse.json({ error: "Invalid schedule." }, { status: 400 });
    Object.assign(update, scheduleColumns(schedule));
  }
  if (Object.keys(update).length === 0) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });

  const { data, error } = await db.from("schedules").update(update).eq("id", id).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Couldn't update the schedule." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const denied = await guard();
  if (denied) return denied;
  const db = admin();
  if (!db) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const { id } = await ctx.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Invalid id." }, { status: 400 });

  const { error } = await db.from("schedules").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Couldn't delete the schedule." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
