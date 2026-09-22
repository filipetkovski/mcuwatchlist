import { NextResponse, type NextRequest } from "next/server";
import { guard } from "@/lib/session";
import { admin } from "@/lib/supabase/admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const g = await guard();
  if (!g.ok) return g.response;
  if (g.session.role !== "admin") {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  const { id } = await ctx.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  if (id === g.session.userId) {
    return NextResponse.json({ error: "You can't delete your own account." }, { status: 400 });
  }

  const db = admin();
  if (!db) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const { error } = await db.from("users").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Couldn't delete user." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
