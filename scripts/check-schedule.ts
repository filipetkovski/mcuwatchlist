// Quick sanity checks for the scheduler: npm run check:schedule
import assert from "node:assert/strict";
import { TITLES } from "../src/data/titles.ts";
import { generateSchedule } from "../src/lib/schedule.ts";
import { diffDays } from "../src/lib/dates.ts";
import type { ScheduleSettings } from "../src/lib/types.ts";

const mcu = TITLES.filter((t) => t.universe === "mcu");
const base: ScheduleSettings = {
  scope: "new-to-marvel", orderType: "story", mode: "strict", paceType: "hours",
  weeklyHours: 10, titlesPerWeek: null, targetFinishDate: null, viewingDays: [5, 6, 0], startDate: "2026-09-21",
};
const ids = (s: ReturnType<typeof generateSchedule>) => s.days.flatMap((d) => d.items.map((i) => i.titleId));

// strict keeps exact order and schedules everything
const strict = generateSchedule(mcu, base);
assert.deepEqual(ids(strict), mcu.map((t) => t.id));
const weeks = diffDays(strict.summary.startDate, strict.summary.finishDate!) / 7;
const expected = strict.summary.totalMinutes / 60 / 10;
assert.ok(Math.abs(weeks - expected) < 1.2, `strict pace off: ${weeks} vs ${expected}`);

// flexible schedules everything exactly once, and never overspends a day's carried budget
const flex = generateSchedule(mcu, { ...base, mode: "flexible" });
assert.equal(ids(flex).length, mcu.length);
assert.equal(new Set(ids(flex)).size, mcu.length);

// titles/week mode
const tpw = generateSchedule(mcu, { ...base, paceType: "titles", weeklyHours: null, titlesPerWeek: 3 });
assert.ok(Math.abs(diffDays("2026-09-21", tpw.summary.finishDate!) / 7 - mcu.length / 3) < 1.2);

// target date only -> derives a pace and lands near/before the target
const target = generateSchedule(mcu, { ...base, weeklyHours: null, targetFinishDate: "2026-12-18" });
assert.ok(target.summary.weeklyHours! > 0);
assert.ok(target.summary.daysOverTarget! <= 7, `finish ${target.summary.finishDate}`);

// nothing remaining
assert.equal(generateSchedule([], base).days.length, 0);
// no viewing days
assert.throws(() => generateSchedule(mcu, { ...base, viewingDays: [] }));
console.log("schedule checks passed", { strictFinish: strict.summary.finishDate, flexFinish: flex.summary.finishDate, targetPace: target.summary.weeklyHours });
