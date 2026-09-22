import type { GeneratedSchedule } from "./types.ts";

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const MAX_JSON_BYTES = 400_000;

/** Structural check on a schedule coming from the browser before it is stored as jsonb. */
export function parseSchedule(value: unknown): GeneratedSchedule | null {
  if (!isObject(value) || value.version !== 1) return null;
  if (JSON.stringify(value).length > MAX_JSON_BYTES) return null;

  const { titleIds, days, settings, summary } = value;
  if (!Array.isArray(titleIds) || titleIds.length === 0 || titleIds.length > 500) return null;
  if (!titleIds.every((id) => typeof id === "string" && id.length > 0 && id.length <= 100)) return null;
  if (!Array.isArray(days) || days.length > 6000) return null;
  if (!isObject(settings) || !isObject(summary)) return null;

  const orderOk = settings.orderType === "story" || settings.orderType === "release";
  const modeOk = settings.mode === "strict" || settings.mode === "flexible";
  const paceOk = settings.paceType === "hours" || settings.paceType === "titles";
  if (!orderOk || !modeOk || !paceOk) return null;

  const positive = (v: unknown) => v === null || (typeof v === "number" && v > 0);
  if (!positive(settings.weeklyHours) || !positive(settings.titlesPerWeek)) return null;
  if (settings.weeklyHours === null && settings.titlesPerWeek === null) return null;
  if (settings.targetFinishDate !== null && !(typeof settings.targetFinishDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(settings.targetFinishDate))) {
    return null;
  }
  return value as unknown as GeneratedSchedule;
}

export const scheduleColumns = (s: GeneratedSchedule) => ({
  weekly_hours: s.settings.weeklyHours,
  titles_per_week: s.settings.titlesPerWeek,
  target_finish_date: s.settings.targetFinishDate,
  mode: s.settings.mode,
  order_type: s.settings.orderType,
  generated_schedule: s,
});
