import { NextResponse, type NextRequest } from "next/server";
import { createListing, getMarketState } from "@/lib/market";
import { guard } from "@/lib/session";
import { admin } from "@/lib/supabase/admin";

const MIN_PRICE = 1;
const MAX_PRICE = 50000;

export async function GET() {
  const g = await guard();
  if (!g.ok) return g.response;
  const db = admin();
  if (!db) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const state = await getMarketState(db, g.session.userId);
  return NextResponse.json(state);
}

export async function POST(req: NextRequest) {
  const g = await guard();
  if (!g.ok) return g.response;
  const db = admin();
  if (!db) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const body = (await req.json().catch(() => null)) as { characterId?: unknown; price?: unknown } | null;
  const characterId = typeof body?.characterId === "string" ? body.characterId : "";
  const price = body?.price;
  if (!characterId || typeof price !== "number" || !Number.isInteger(price) || price < MIN_PRICE || price > MAX_PRICE) {
    return NextResponse.json({ error: "Invalid listing." }, { status: 400 });
  }

  const result = await createListing(db, g.session.userId, characterId, price);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result, { status: 201 });
}
