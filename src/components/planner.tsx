"use client";

import { useMemo, useState } from "react";
import { downloadIcs, googleCalendarUrl } from "@/lib/calendar";
import { addDays, diffDays, formatDay, todayISO, weekStart } from "@/lib/dates";
import { formatHours } from "@/lib/format";
import { DOOMSDAY_RELEASE, SCOPE_IDS, SCOPE_LABELS, SHARED_PROGRESS_KEY, titlesForScope } from "@/lib/paths";
import { ScheduleError, generateSchedule } from "@/lib/schedule";
import { sortTitles } from "@/lib/titles";
import type { GeneratedSchedule, OrderType, SavedSchedule, ScheduleDay, ScheduleMode, ScopeId, Title } from "@/lib/types";
import { useToday } from "@/lib/use-today";
import { useApp } from "./app-provider";
import { ProgressNotices } from "./progress-notices";
import { RateModal } from "./rate-modal";
import { TitleRow } from "./title-row";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DEFAULT_DAYS = [5, 6, 0];

const fieldClass = "w-full rounded-lg border-2 border-black bg-surface-2 px-3 py-2.5 text-sm";
const ghostBtn =
  "rounded-lg border-2 border-black bg-surface-2 px-3 py-1.5 text-sm hover:bg-surface disabled:opacity-60";
const ghostBtnLg =
  "rounded-lg border-2 border-black bg-surface-2 px-4 py-2.5 text-base font-medium hover:bg-surface disabled:opacity-60";

export function Planner({ titles }: { titles: Title[] }) {
  const { dataReady } = useApp();
  if (!dataReady) return <p className="text-muted">Loading your plans…</p>;
  return <PlannerBody titles={titles} />;
}

function PlannerBody({ titles }: { titles: Title[] }) {
  const { isWatched, schedules, saveSchedule, deleteSchedule } = useApp();

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
  const activeSaved = schedules[0] ?? null;
  const settingsVisible = draft === null && activeSaved === null;

  const remaining = sortTitles(titlesForScope(titles, scope), orderType).filter((t) => !isWatched(SHARED_PROGRESS_KEY, t.id));
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
      setDraft(null);
    }
  };

  const remove = async (saved: SavedSchedule) => {
    if (!window.confirm(`Delete "${saved.name}" and its checked titles?`)) return;
    setBusy(true);
    await deleteSchedule(saved.id);
    setBusy(false);
  };

  const toggleDay = (d: number) => setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  const paceLabel = paceType === "hours" ? "Hours per week" : "Titles per week";

  return (
    <div className="space-y-8">
      <ProgressNotices />
      <div className={settingsVisible ? "grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]" : "space-y-4"}>
        {settingsVisible && (
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
        )}

        <section aria-label="Your schedule" className="min-w-0 space-y-4">
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
                  <button
                    type="button"
                    onClick={() => downloadIcs(draft.schedule, draft.name || "MCU schedule")}
                    className={ghostBtn}
                  >
                    Add to calendar
                  </button>
                  <button type="button" onClick={() => setDraft(null)} className={ghostBtn}>
                    Discard
                  </button>
                </div>
              </div>
              <ScheduleView schedule={draft.schedule} pathId={null} titles={titles} />
            </>
          ) : activeSaved ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-2xl">{activeSaved.name}</h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => downloadIcs(activeSaved.schedule, activeSaved.name)}
                    className={ghostBtnLg}
                  >
                    Add to calendar
                  </button>
                  <button type="button" onClick={() => void remove(activeSaved)} disabled={busy} className={`${ghostBtnLg} text-muted hover:text-ink`}>
                    Delete
                  </button>
                </div>
              </div>
              <ScheduleView schedule={activeSaved.schedule} pathId={activeSaved.id} titles={titles} />
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

function ScheduleView({ schedule, pathId, titles }: { schedule: GeneratedSchedule; pathId: string | null; titles: Title[] }) {
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
  const dateFmt = { month: "short", day: "numeric", year: "numeric" } as const;
  const shortFmt = { month: "short", day: "numeric" } as const;

  return (
    <>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Finish date" value={summary.finishDate ? formatDay(summary.finishDate, dateFmt) : "-"} />
        <Stat label="Titles" value={pathId ? `${done}/${schedule.titleIds.length} done` : String(summary.totalTitles)} />
        <Stat label="Total time" value={formatHours(summary.totalMinutes)} />
        <Stat label="Weeks" value={String(weeks.length)} />
      </dl>

      {pathId === null && settings.targetFinishDate && summary.finishDate && (
        <p
          className={`rounded-lg border-2 border-black px-3 py-2 text-sm font-medium ${
            summary.onTrack ? "text-white" : "bg-warn text-black"
          }`}
          style={summary.onTrack ? { backgroundColor: "#1f8a4f" } : undefined}
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

      {weeks.length === 0 ? (
        <p className="text-muted">Everything in this plan is scheduled or watched.</p>
      ) : (
        <WeekPager weeks={weeks} today={today} pathId={pathId} titles={titles} titleIds={schedule.titleIds} />
      )}
    </>
  );
}

function WeekPager({
  weeks,
  today,
  pathId,
  titles,
  titleIds,
}: {
  weeks: Array<[string, ScheduleDay[]]>;
  today: string | null;
  pathId: string | null;
  titles: Title[];
  titleIds: string[];
}) {
  const { isWatched, setWatched, ratingFor, rateTitle } = useApp();
  // Open on the first week that isn't fully watched yet, so returning to the planner picks up
  // where you left off instead of always starting at week 1.
  const [requested, setRequested] = useState(() => {
    if (pathId === null) return 0;
    const idx = weeks.findIndex(([, days]) => days.some((d) => d.items.some((i) => !isWatched(pathId, i.titleId))));
    return idx === -1 ? weeks.length - 1 : idx;
  });
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [ratingPrompt, setRatingPrompt] = useState<{ title: Title; pendingWatch: boolean } | null>(null);
  const titleMap = useMemo(() => new Map(titles.map((t) => [t.id, t])), [titles]);
  const positions = useMemo(() => new Map(titleIds.map((id, i) => [id, i + 1])), [titleIds]);
  const index = Math.min(requested, weeks.length - 1);
  const [start, weekDays] = weeks[index];
  const minutes = weekDays.reduce((sum, d) => sum + d.minutes, 0);
  const rows = useMemo(
    () => weekDays.flatMap((day) => day.items.map((item) => ({ item, date: day.date }))),
    [weekDays],
  );

  // Marks a title watched and, if that was the last unwatched title this week, jumps to the next week.
  const markWatchedAndAdvance = (titleId: string) => {
    if (pathId === null) return;
    setWatched(pathId, [titleId], true);
    const stillUnwatched = rows.some((r) => r.item.titleId !== titleId && !isWatched(pathId, r.item.titleId));
    if (!stillUnwatched && index < weeks.length - 1) setRequested(index + 1);
  };

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

      <div className="space-y-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
          <p className="text-sm text-muted">
            {formatDay(start, { month: "short", day: "numeric" })} – {formatDay(addDays(start, 6), { month: "short", day: "numeric" })}
          </p>
          <span className="text-sm text-muted">{formatHours(minutes)} this week</span>
        </div>
        {rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">Nothing scheduled this week.</p>
        ) : (
          <ol className="space-y-3">
            {rows.map(({ item, date }) => {
              const t = titleMap.get(item.titleId);
              if (!t) return null;
              const watched = pathId !== null && isWatched(pathId, item.titleId);
              return (
                <TitleRow
                  key={item.titleId}
                  title={t}
                  position={positions.get(item.titleId)}
                  watched={watched}
                  skipped={skipped.has(item.titleId)}
                  rating={ratingFor(item.titleId)}
                  date={date}
                  isToday={today === date}
                  calendarUrl={googleCalendarUrl({ date, items: [item], minutes: item.runtimeMinutes })}
                  onToggle={
                    pathId !== null
                      ? (value) => {
                          if (value) {
                            // Wait for the rating to be confirmed before marking watched, so the
                            // row's color only changes once rating is done - not on click.
                            if (ratingFor(item.titleId).mine === null) {
                              setRatingPrompt({ title: t, pendingWatch: true });
                              return;
                            }
                            markWatchedAndAdvance(item.titleId);
                          } else {
                            setWatched(pathId, [item.titleId], false);
                            if (ratingFor(item.titleId).mine !== null) rateTitle(item.titleId, null);
                          }
                        }
                      : undefined
                  }
                  onSkip={
                    pathId !== null
                      ? () =>
                          setSkipped((prev) => {
                            const next = new Set(prev);
                            if (next.has(item.titleId)) next.delete(item.titleId);
                            else next.add(item.titleId);
                            return next;
                          })
                      : undefined
                  }
                  onRate={pathId !== null ? () => setRatingPrompt({ title: t, pendingWatch: false }) : undefined}
                />
              );
            })}
          </ol>
        )}
      </div>

      {ratingPrompt && (
        <RateModal
          title={ratingPrompt.title}
          onClose={() => setRatingPrompt(null)}
          onCancel={() => setRatingPrompt(null)}
          onRated={ratingPrompt.pendingWatch && pathId !== null ? () => markWatchedAndAdvance(ratingPrompt.title.id) : undefined}
        />
      )}
    </div>
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
    <div className="comic-panel px-4 py-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-display text-3xl font-semibold tabular-nums sm:text-4xl">{value}</dd>
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
