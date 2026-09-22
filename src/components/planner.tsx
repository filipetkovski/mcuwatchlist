"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { addDays, diffDays, formatDay, todayISO, weekStart } from "@/lib/dates";
import { formatHours, formatRuntime } from "@/lib/format";
import { DOOMSDAY_RELEASE, SCOPE_IDS, SCOPE_LABELS, titlesForScope } from "@/lib/paths";
import { ScheduleError, generateSchedule } from "@/lib/schedule";
import { sortTitles } from "@/lib/titles";
import type { GeneratedSchedule, OrderType, SavedSchedule, ScheduleDay, ScheduleMode, ScopeId, Title } from "@/lib/types";
import { useToday } from "@/lib/use-today";
import { useApp } from "./app-provider";
import { ProgressNotices } from "./progress-notices";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DEFAULT_DAYS = [5, 6, 0];

const fieldClass = "w-full rounded-lg border-2 border-black bg-surface-2 px-3 py-2.5 text-sm";
const ghostBtn =
  "rounded-lg border-2 border-black bg-surface-2 px-3 py-1.5 text-sm hover:bg-surface disabled:opacity-60";

export function Planner({ titles }: { titles: Title[] }) {
  const { dataReady } = useApp();
  if (!dataReady) return <p className="text-muted">Loading your plans…</p>;
  return <PlannerBody titles={titles} />;
}

function PlannerBody({ titles }: { titles: Title[] }) {
  const { isWatched, schedules, saveSchedule, updateSchedule, deleteSchedule } = useApp();

  const [scope, setScope] = useState<ScopeId>("prepare-for-doomsday");
  const [orderType, setOrderType] = useState<OrderType>("story");
  const [mode, setMode] = useState<ScheduleMode>("strict");
  const [paceType, setPaceType] = useState<"hours" | "titles">("hours");
  const [hours, setHours] = useState("8");
  const [perWeek, setPerWeek] = useState("3");
  const [target, setTarget] = useState("");
  const [days, setDays] = useState<number[]>(DEFAULT_DAYS);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [draft, setDraft] = useState<{ schedule: GeneratedSchedule; name: string } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeSaved = schedules.find((s) => s.id === selectedId) ?? schedules[0] ?? null;

  const remaining = sortTitles(titlesForScope(titles, scope), orderType).filter((t) => !isWatched(scope, t.id));
  const remainingMinutes = remaining.reduce((sum, t) => sum + t.runtime_minutes, 0);

  const generate = () => {
    setFormError(null);
    const weeklyHours = paceType === "hours" && hours.trim() !== "" ? Number(hours) : null;
    const titlesPerWeek = paceType === "titles" && perWeek.trim() !== "" ? Number(perWeek) : null;
    if ((weeklyHours !== null && !(weeklyHours > 0)) || (titlesPerWeek !== null && !(titlesPerWeek > 0))) {
      setFormError("Pace must be a number greater than zero.");
      return;
    }
    if (remaining.length === 0) {
      setFormError("Nothing left to schedule in this path. You're all caught up!");
      return;
    }
    const startDate = todayISO();
    try {
      const schedule = generateSchedule(remaining, {
        scope,
        orderType,
        mode,
        paceType,
        weeklyHours,
        titlesPerWeek,
        targetFinishDate: target || null,
        viewingDays: days,
        startDate,
      });
      setDraft({ schedule, name: `${SCOPE_LABELS[scope]} · ${formatDay(startDate, { month: "short", day: "numeric" })}` });
    } catch (e) {
      setFormError(e instanceof ScheduleError ? e.message : "Something went wrong building the schedule.");
    }
  };

  const saveDraft = async () => {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) {
      setFormError("Give the plan a name.");
      return;
    }
    setBusy(true);
    setFormError(null);
    const saved = await saveSchedule(name.slice(0, 60), draft.schedule);
    setBusy(false);
    if (saved) {
      setSelectedId(saved.id);
      setDraft(null);
    }
  };

  const recalculate = async (saved: SavedSchedule) => {
    setFormError(null);
    const s = saved.schedule;
    const list = sortTitles(
      titles.filter((t) => s.titleIds.includes(t.id)),
      s.settings.orderType,
    ).filter((t) => !isWatched(saved.id, t.id));
    if (list.length === 0) {
      setFormError("Everything in this plan is already watched.");
      return;
    }
    setBusy(true);
    try {
      const next = { ...generateSchedule(list, { ...s.settings, startDate: todayISO() }), titleIds: s.titleIds };
      await updateSchedule(saved.id, next);
    } catch (e) {
      setFormError(e instanceof ScheduleError ? e.message : "Something went wrong recalculating.");
    }
    setBusy(false);
  };

  const remove = async (saved: SavedSchedule) => {
    if (!window.confirm(`Delete "${saved.name}" and its checked titles?`)) return;
    setBusy(true);
    await deleteSchedule(saved.id);
    setSelectedId(null);
    setBusy(false);
  };

  const toggleDay = (d: number) => setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  const paceLabel = paceType === "hours" ? "Hours per week" : "Titles per week";

  return (
    <div className="space-y-8">
      <ProgressNotices />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <section aria-label="Schedule settings" className="comic-panel space-y-5 p-5 lg:self-start">
          <Field label="What to watch">
            <select value={scope} onChange={(e) => setScope(e.target.value as ScopeId)} className={fieldClass}>
              {SCOPE_IDS.map((id) => (
                <option key={id} value={id}>
                  {SCOPE_LABELS[id]}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-muted">
              {remaining.length} left on this path · {formatHours(remainingMinutes)} of viewing
            </p>
          </Field>

          <Field label="Order">
            <Segmented
              value={orderType}
              onChange={setOrderType}
              options={[
                ["story", "Story"],
                ["release", "Release"],
              ]}
            />
          </Field>

          <Field label="Pace">
            <Segmented
              value={paceType}
              onChange={setPaceType}
              options={[
                ["hours", "Hours / week"],
                ["titles", "Titles / week"],
              ]}
            />
            <input
              type="number"
              inputMode="decimal"
              min="0.5"
              step="0.5"
              value={paceType === "hours" ? hours : perWeek}
              onChange={(e) => (paceType === "hours" ? setHours(e.target.value) : setPerWeek(e.target.value))}
              aria-label={paceLabel}
              placeholder={target ? "Auto from target date" : paceLabel}
              className={`${fieldClass} mt-2`}
            />
            <p className="mt-1.5 text-xs text-muted">Leave blank to work it out from a target date.</p>
          </Field>

          <Field label="Target finish date (optional)">
            <input type="date" value={target} onChange={(e) => setTarget(e.target.value)} className={fieldClass} />
            <button type="button" onClick={() => setTarget(DOOMSDAY_RELEASE)} className="mt-1.5 text-xs text-accent-text underline underline-offset-2">
              Finish by Doomsday release ({formatDay(DOOMSDAY_RELEASE, { month: "short", day: "numeric", year: "numeric" })})
            </button>
          </Field>

          <Field label="Viewing days">
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((label, d) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={days.includes(d)}
                  onClick={() => toggleDay(d)}
                  className={`w-11 rounded-md border py-1.5 text-sm ${
                    days.includes(d) ? "border-black bg-accent text-white shadow-[2px_2px_0_#000]" : "border-line text-muted hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Mode">
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                ["strict", "Strict"],
                ["flexible", "Flexible"],
              ]}
            />
            <p className="mt-1.5 text-xs text-muted">
              {mode === "strict"
                ? "Exact order, always. A long title can spill into your next sessions' time."
                : "Nearby titles may swap places so each session fits your time, never by more than a few spots."}
            </p>
          </Field>

          {formError && (
            <p role="alert" className="rounded-lg border-2 border-black bg-warn px-3 py-2 text-sm font-medium text-black">
              {formError}
            </p>
          )}

          <button type="button" onClick={generate} disabled={busy} className="comic-btn w-full rounded-lg bg-accent px-4 py-2.5 text-lg text-white disabled:opacity-60">
            Preview schedule
          </button>
        </section>

        <section aria-label="Your schedule" className="min-w-0 space-y-4">
          {(schedules.length > 0 || draft) && (
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Plans">
              {draft && (
                <PlanChip active onClick={() => {}}>
                  Preview (not saved)
                </PlanChip>
              )}
              {schedules.map((s) => (
                <PlanChip
                  key={s.id}
                  active={!draft && activeSaved?.id === s.id}
                  onClick={() => {
                    setDraft(null);
                    setSelectedId(s.id);
                  }}
                >
                  <span aria-hidden="true">★ </span>
                  {s.name}
                </PlanChip>
              ))}
            </div>
          )}

          {draft ? (
            <>
              <div className="comic-panel space-y-3 p-4">
                <p className="text-sm text-muted">
                  This is a preview. Save it to add it as a path, with its own checked titles, under Watch order.
                </p>
                <div className="flex flex-wrap gap-2">
                  <input
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    maxLength={60}
                    aria-label="Plan name"
                    className={`${fieldClass} min-w-0 flex-1`}
                  />
                  <button type="button" onClick={() => void saveDraft()} disabled={busy} className="comic-btn rounded-lg bg-accent px-4 py-2 text-white disabled:opacity-60">
                    Save as path
                  </button>
                  <button type="button" onClick={() => setDraft(null)} className={ghostBtn}>
                    Discard
                  </button>
                </div>
              </div>
              <ScheduleView schedule={draft.schedule} pathId={null} />
            </>
          ) : activeSaved ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-2xl">{activeSaved.name}</h2>
                <div className="flex gap-2">
                  <Link href={`/watch-order/story?path=${activeSaved.id}`} className={ghostBtn}>
                    Open path
                  </Link>
                  <button type="button" onClick={() => void recalculate(activeSaved)} disabled={busy} className={ghostBtn}>
                    Recalculate
                  </button>
                  <button type="button" onClick={() => void remove(activeSaved)} disabled={busy} className={`${ghostBtn} text-muted hover:text-ink`}>
                    Delete
                  </button>
                </div>
              </div>
              <ScheduleView schedule={activeSaved.schedule} pathId={activeSaved.id} />
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-line p-8 text-center text-muted">
              <p className="font-display text-lg text-ink">No schedule yet</p>
              <p className="mt-1 text-sm">Set your pace and hit Preview. Save it and it becomes a path you can check titles off on.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ScheduleView({ schedule, pathId }: { schedule: GeneratedSchedule; pathId: string | null }) {
  const { isWatched } = useApp();
  const { summary, settings } = schedule;
  const today = useToday();

  const weeks = useMemo(() => {
    const map = new Map<string, ScheduleDay[]>();
    for (const day of schedule.days) {
      const key = weekStart(day.date);
      map.set(key, [...(map.get(key) ?? []), day]);
    }
    return [...map.entries()];
  }, [schedule.days]);

  const done = pathId ? schedule.titleIds.filter((id) => isWatched(pathId, id)).length : 0;
  const overdue =
    pathId !== null &&
    today !== null &&
    schedule.days.some((d) => d.date < today && d.items.some((i) => !isWatched(pathId, i.titleId)));
  const paceText =
    settings.paceType === "hours" ? `${summary.weeklyHours ?? "?"} h/week` : `${summary.titlesPerWeek ?? "?"} titles/week`;
  const dateFmt = { month: "short", day: "numeric", year: "numeric" } as const;
  const shortFmt = { month: "short", day: "numeric" } as const;

  return (
    <>
      <div className="comic-panel p-5">
        <p className="text-sm text-muted">
          {SCOPE_LABELS[settings.scope]} · {settings.orderType === "story" ? "Story" : "Release"} order · {settings.mode} · {paceText}
        </p>

        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Finish date" value={summary.finishDate ? formatDay(summary.finishDate, dateFmt) : "-"} />
          <Stat label="Titles" value={pathId ? `${done}/${schedule.titleIds.length} done` : String(summary.totalTitles)} />
          <Stat label="Total time" value={formatHours(summary.totalMinutes)} />
          <Stat label="Weeks" value={String(weeks.length)} />
        </dl>

        {settings.targetFinishDate && summary.finishDate && (
          <p
            className={`mt-4 rounded-lg border-2 border-black px-3 py-2 text-sm font-medium text-black ${
              summary.onTrack ? "bg-good" : "bg-warn"
            }`}
          >
            {summary.onTrack
              ? `On track to finish ${diffDays(summary.finishDate, settings.targetFinishDate)} days before ${formatDay(settings.targetFinishDate, shortFmt)}.`
              : `This pace finishes ${summary.daysOverTarget} days after your ${formatDay(settings.targetFinishDate, shortFmt)} target. You'd need about ${
                  settings.paceType === "hours"
                    ? `${Math.ceil((summary.requiredWeeklyHours ?? 0) * 2) / 2} hours`
                    : `${Math.ceil((summary.requiredTitlesPerWeek ?? 0) * 2) / 2} titles`
                } a week.`}
          </p>
        )}
        {summary.truncated && (
          <p className="mt-3 rounded-lg border-2 border-black bg-warn px-3 py-2 text-sm font-medium text-black">
            At this pace the plan runs longer than we can lay out. Try raising your weekly pace.
          </p>
        )}
        {overdue && (
          <p className="mt-3 rounded-lg border-2 border-black bg-warn px-3 py-2 text-sm font-medium text-black">
            Some sessions are behind you. Recalculate to shift what&apos;s left forward from today.
          </p>
        )}
      </div>

      {weeks.length === 0 ? (
        <p className="text-muted">Everything in this plan is scheduled or watched.</p>
      ) : (
        <WeekPager weeks={weeks} today={today} pathId={pathId} />
      )}
    </>
  );
}

function WeekPager({ weeks, today, pathId }: { weeks: Array<[string, ScheduleDay[]]>; today: string | null; pathId: string | null }) {
  const { isWatched, setWatched } = useApp();
  const [requested, setRequested] = useState(0);
  const index = Math.min(requested, weeks.length - 1);
  const [start, weekDays] = weeks[index];
  const minutes = weekDays.reduce((sum, d) => sum + d.minutes, 0);

  const arrow =
    "comic-btn flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-x-0 disabled:hover:translate-y-0";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-xl">
          Week {index + 1} <span className="text-muted">of {weeks.length}</span>
        </h3>
        <div className="flex gap-2">
          <button type="button" onClick={() => setRequested(index - 1)} disabled={index === 0} aria-label="Previous week" className={arrow}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path d="m15 5-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button type="button" onClick={() => setRequested(index + 1)} disabled={index === weeks.length - 1} aria-label="Next week" className={arrow}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <section aria-label={`Week ${index + 1}`} className="comic-panel">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-[3px] border-black px-4 py-3">
          <p className="text-sm text-muted">
            {formatDay(start, { month: "short", day: "numeric" })} – {formatDay(addDays(start, 6), { month: "short", day: "numeric" })}
          </p>
          <span className="text-sm text-muted">{formatHours(minutes)} this week</span>
        </div>
        <ul className="divide-y divide-line">
          {weekDays.map((day) => (
            <li key={day.date} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:gap-4">
              <p className="w-28 shrink-0 text-sm">
                <span className={today === day.date ? "font-semibold text-accent-text" : "text-muted"}>{formatDay(day.date)}</span>
                {today === day.date && <span className="ml-1.5 text-xs text-accent-text">today</span>}
              </p>
              <ul className="min-w-0 flex-1 space-y-1.5">
                {day.items.map((item) => {
                  const watched = pathId !== null && isWatched(pathId, item.titleId);
                  const id = `sched-${day.date}-${item.titleId}`;
                  return (
                    <li key={item.titleId} className="flex items-center gap-2.5">
                      {pathId !== null ? (
                        <input
                          id={id}
                          type="checkbox"
                          checked={watched}
                          onChange={(e) => setWatched(pathId, [item.titleId], e.target.checked)}
                          className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--color-accent)]"
                        />
                      ) : (
                        <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-accent" />
                      )}
                      <label htmlFor={id} className={`min-w-0 flex-1 text-sm ${pathId !== null ? "cursor-pointer" : ""} ${watched ? "text-muted line-through" : ""}`}>
                        {item.title}
                      </label>
                      <span className="shrink-0 text-xs text-muted">{formatRuntime(item.runtimeMinutes)}</span>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function PlanChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm transition-colors ${
        active ? "border-black bg-accent text-white shadow-[2px_2px_0_#000]" : "border-line text-muted hover:border-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-2.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-display text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<[T, string]>;
}) {
  return (
    <div className="inline-flex w-full rounded-lg border-2 border-black bg-surface-2 p-1">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            value === v ? "bg-accent text-white shadow-[2px_2px_0_#000]" : "text-muted hover:text-ink"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
