import { NextResponse, type NextRequest } from "next/server";
import { guard } from "@/lib/session";
import { admin } from "@/lib/supabase/admin";

const MAX_CLICKS = 500;
const MIN_INTERVAL_MS = 50;   // < 50ms between taps is humanly impossible
const MAX_CPS = 12;           // > 12 taps/sec is beyond human capability
const REGULARITY_THRESHOLD = 10; // ms — autoclickers have std-dev well below this
const SESSION_COOLDOWN_MS = 30_000; // 30 s between sessions per user

// Module-level cooldown store — works for single-instance; acts as a second line of
// defence even if the instance restarts, since valid humans wait between sessions anyway.
const lastSession = new Map<string, number>();

function validateTimestamps(timestamps: number[], clicks: number): string | null {
  if (timestamps.length !== clicks) return "Session data mismatch.";

  const now = Date.now();
  for (const ts of timestamps) {
    if (ts > now + 1000) return "Invalid session data.";         // future timestamps
    if (ts < now - 15 * 60_000) return "Session expired.";      // older than 15 min
  }

  if (clicks === 1) return null;

  // Collect intervals and check minimum gap
  const intervals: number[] = [];
  for (let i = 1; i < timestamps.length; i++) {
    const gap = timestamps[i] - timestamps[i - 1];
    if (gap < MIN_INTERVAL_MS) return "Clicks too fast.";
    intervals.push(gap);
  }

  // Check average rate
  const duration = timestamps[timestamps.length - 1] - timestamps[0];
  if (duration > 0 && (clicks - 1) / (duration / 1000) > MAX_CPS) {
    return "Click rate too high.";
  }

  // Regularity check — autoclickers fire at perfectly even intervals (std-dev ≈ 0–5 ms).
  // Real humans show natural jitter well above REGULARITY_THRESHOLD.
  if (clicks >= 20) {
    const mean = intervals.reduce((s, v) => s + v, 0) / intervals.length;
    const variance = intervals.reduce((s, v) => s + (v - mean) ** 2, 0) / intervals.length;
    if (Math.sqrt(variance) < REGULARITY_THRESHOLD) return "Click pattern too regular.";
  }

  return null;
}

export async function POST(req: NextRequest) {
  const g = await guard();
  if (!g.ok) return g.response;
  const db = admin();
  if (!db) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  // Per-user session cooldown
  const last = lastSession.get(g.session.userId) ?? 0;
  const remaining = SESSION_COOLDOWN_MS - (Date.now() - last);
  if (remaining > 0) {
    return NextResponse.json(
      { error: `Please wait ${Math.ceil(remaining / 1000)} seconds before starting a new session.` },
      { status: 429 },
    );
  }

  const body = (await req.json().catch(() => null)) as { clicks?: unknown; timestamps?: unknown; _trap?: unknown } | null;

  // Honeypot: legitimate clients never send this field; bots copying the schema often do.
  if (body?._trap !== undefined) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const clicks = body?.clicks;
  const timestamps = body?.timestamps;

  if (typeof clicks !== "number" || !Number.isInteger(clicks) || clicks < 1) {
    return NextResponse.json({ error: "Invalid clicks." }, { status: 400 });
  }
  if (!Array.isArray(timestamps) || !timestamps.every((t) => typeof t === "number")) {
    return NextResponse.json({ error: "Missing timing data." }, { status: 400 });
  }

  const invalid = validateTimestamps(timestamps as number[], clicks);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  lastSession.set(g.session.userId, Date.now());

  const awarded = Math.min(clicks, MAX_CLICKS);
  const { error } = await db.rpc("adjust_vibranium", {
    p_user_id: g.session.userId,
    p_delta: awarded,
  });
  if (error) return NextResponse.json({ error: "Couldn't award vibranium." }, { status: 500 });

  const { data: userRow } = await db.from("users").select("vibranium").eq("id", g.session.userId).single();
  return NextResponse.json({ awarded, vibranium: userRow?.vibranium ?? 0 });
}
