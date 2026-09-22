import { addDays, dayOfWeek, diffDays } from "./dates.ts";
import type { GeneratedSchedule, ScheduleDay, ScheduleItem, ScheduleSettings, Title } from "./types.ts";

const EPS = 1e-9;
const MAX_DAYS = 5000;
/** Flexible mode looks this many titles ahead when filling a day. */
const LOOKAHEAD = 4;
/** ...but the next-in-order title can only be passed over this many times in a row. */
const MAX_SKIPS = 3;

export class ScheduleError extends Error {}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const toItem = (t: Title): ScheduleItem => ({
  titleId: t.id,
  title: t.title,
  type: t.type,
  runtimeMinutes: t.runtime_minutes,
});

/**
 * Builds a day-by-day plan from already-ordered, still-unwatched titles.
 *
 * Each viewing day earns an equal share of the weekly budget (minutes or title count). Unspent
 * budget carries forward, so long-run pace matches the weekly target exactly.
 *  - strict: titles are always taken in order; a title may start whenever budget is positive and
 *    any overshoot is paid back on later days (so a 3-hour film can spill into the next sessions).
 *  - flexible: never overspends; each day fills with the largest title that fits among the next
 *    few in order, and the next-in-order title can be passed over at most MAX_SKIPS times.
 * If no pace is given but a target date is, the pace needed to hit that date is used.
 */
export function generateSchedule(ordered: Title[], settings: ScheduleSettings): GeneratedSchedule {
  const viewingDays = [...new Set(settings.viewingDays)].filter((d) => d >= 0 && d <= 6).sort();
  if (viewingDays.length === 0) throw new ScheduleError("Pick at least one viewing day.");

  const { startDate, targetFinishDate, paceType } = settings;
  const totalMinutes = sum(ordered.map((t) => t.runtime_minutes));
  const totalTitles = ordered.length;

  const weeksToTarget = targetFinishDate ? Math.max(diffDays(startDate, targetFinishDate) + 1, 1) / 7 : null;
  const requiredWeeklyHours = weeksToTarget ? totalMinutes / 60 / weeksToTarget : null;
  const requiredTitlesPerWeek = weeksToTarget ? totalTitles / weeksToTarget : null;

  let weeklyHours = settings.weeklyHours;
  let titlesPerWeek = settings.titlesPerWeek;
  if (paceType === "hours" && !weeklyHours && requiredWeeklyHours) weeklyHours = Math.ceil(requiredWeeklyHours * 4) / 4;
  if (paceType === "titles" && !titlesPerWeek && requiredTitlesPerWeek) titlesPerWeek = Math.ceil(requiredTitlesPerWeek * 4) / 4;

  const weekly = paceType === "hours" ? (weeklyHours ?? 0) * 60 : (titlesPerWeek ?? 0);
  if (!(weekly > 0)) throw new ScheduleError("Enter a weekly pace or a target finish date.");

  const allowance = weekly / viewingDays.length;
  const cost = (t: Title) => (paceType === "hours" ? t.runtime_minutes : 1);

  const queue = [...ordered];
  const days: ScheduleDay[] = [];
  let bucket = 0;
  let skips = 0;
  let date = startDate;

  for (let i = 0; queue.length > 0 && i < MAX_DAYS; i++, date = addDays(date, 1)) {
    if (!viewingDays.includes(dayOfWeek(date))) continue;
    bucket += allowance;
    const picked: Title[] = [];

    if (settings.mode === "strict") {
      while (queue.length > 0 && bucket > EPS) {
        const next = queue.shift()!;
        bucket -= cost(next);
        picked.push(next);
      }
    } else {
      for (;;) {
        const window = queue.slice(0, skips >= MAX_SKIPS ? 1 : LOOKAHEAD);
        let best = -1;
        window.forEach((t, idx) => {
          if (cost(t) <= bucket + EPS && (best === -1 || cost(t) > cost(window[best]))) best = idx;
        });
        if (best === -1) break;
        skips = best === 0 ? 0 : skips + 1;
        const [next] = queue.splice(best, 1);
        bucket -= cost(next);
        picked.push(next);
      }
    }

    if (picked.length > 0) {
      days.push({ date, items: picked.map(toItem), minutes: sum(picked.map((t) => t.runtime_minutes)) });
    }
  }

  const finishDate = days.length > 0 ? days[days.length - 1].date : null;
  const daysOverTarget = finishDate && targetFinishDate ? Math.max(diffDays(targetFinishDate, finishDate), 0) : null;

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    titleIds: ordered.map((t) => t.id),
    settings: { ...settings, weeklyHours, titlesPerWeek, viewingDays },
    days,
    summary: {
      totalTitles,
      totalMinutes,
      startDate,
      finishDate,
      weeklyHours,
      titlesPerWeek,
      onTrack: targetFinishDate && finishDate ? daysOverTarget === 0 : null,
      daysOverTarget,
      requiredWeeklyHours,
      requiredTitlesPerWeek,
      truncated: queue.length > 0,
    },
  };
}
