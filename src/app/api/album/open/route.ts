import { NextResponse, type NextRequest } from "next/server";
import { openPack } from "@/lib/album";
import { PACKS } from "@/lib/album-data";
import { guard } from "@/lib/session";
import { admin } from "@/lib/supabase/admin";
import type { AlbumPackType } from "@/lib/types";

export async function POST(req: NextRequest) {
  const g = await guard();
  if (!g.ok) return g.response;
  const db = admin();
  if (!db) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const body = (await req.json().catch(() => null)) as { packType?: unknown } | null;
  const packType = body?.packType;
  if (typeof packType !== "string" || !(packType in PACKS)) {
    return NextResponse.json({ error: "Invalid pack." }, { status: 400 });
  }

  const result = await openPack(db, g.session.userId, packType as AlbumPackType);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
