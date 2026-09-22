// All dates are calendar dates as "YYYY-MM-DD" strings, handled via UTC math so DST never shifts them.

const DAY_MS = 86_400_000;

export function toUTC(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUTC(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function todayISO(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${mm}-${dd}`;
}

export function addDays(date: string, days: number): string {
  return fromUTC(toUTC(date) + days * DAY_MS);
}

export function diffDays(from: string, to: string): number {
  return Math.round((toUTC(to) - toUTC(from)) / DAY_MS);
}

/** 0 = Sunday ... 6 = Saturday */
export function dayOfWeek(date: string): number {
  return new Date(toUTC(date)).getUTCDay();
}

/** Monday of the week containing `date`. */
export function weekStart(date: string): string {
  const dow = dayOfWeek(date);
  return addDays(date, dow === 0 ? -6 : 1 - dow);
}

export function formatDay(date: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" }): string {
  return new Intl.DateTimeFormat("en-US", { ...opts, timeZone: "UTC" }).format(new Date(toUTC(date)));
}
