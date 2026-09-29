import { NextResponse } from "next/server";
import { guard } from "@/lib/session";
import { admin } from "@/lib/supabase/admin";

const PRICE_PER_DUPLICATE = 5;

export async function POST() {
  const g = await guard();
  if (!g.ok) return g.response;
  const db = admin();
  if (!db) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const { data, error } = await db.rpc("sell_duplicates", {
    p_user_id: g.session.userId,
    p_price_each: PRICE_PER_DUPLICATE,
  });
  if (error) return NextResponse.json({ error: "Couldn't sell duplicates." }, { status: 500 });

  const earned = (data as number) ?? 0;
  const { data: userRow } = await db.from("users").select("vibranium").eq("id", g.session.userId).single();
  return NextResponse.json({ earned, vibranium: userRow?.vibranium ?? 0 });
}
