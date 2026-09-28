import { addDays } from "./dates";
import { formatRuntime } from "./format";
import type { GeneratedSchedule, ScheduleDay } from "./types";

const compactDate = (date: string) => date.replace(/-/g, "");

function icsEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

// RFC 5545 requires content lines to be folded at 75 octets, with continuations starting with a space.
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  let out = line.slice(0, 75);
  let rest = line.slice(75);
  while (rest.length > 0) {
    out += "\r\n " + rest.slice(0, 74);
    rest = rest.slice(74);
  }
  return out;
}

function daySummary(day: ScheduleDay): string {
  return day.items.length === 1 ? day.items[0].title : `${day.items.length} titles to watch`;
}

function dayDescription(day: ScheduleDay): string {
  return day.items.map((i) => `${i.title} (${formatRuntime(i.runtimeMinutes)})`).join("\n");
}

/** Builds an .ics calendar (RFC 5545) with one all-day event per viewing session. */
export function buildIcs(schedule: GeneratedSchedule, calendarName: string): string {
  const stamp = `${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MCU Watchlist//Planner//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${icsEscape(calendarName)}`,
  ];
  schedule.days.forEach((day, i) => {
    const start = compactDate(day.date);
    const end = compactDate(addDays(day.date, 1));
    lines.push(
      "BEGIN:VEVENT",
      `UID:${start}-${i}@mcu-watchlist`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${icsEscape(daySummary(day))}`,
      `DESCRIPTION:${icsEscape(dayDescription(day))}`,
      "END:VEVENT",
    );
  });
  lines.push("END:VCALENDAR");
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}

/** A Google Calendar "quick add" link prefilled with a single day's viewing session. */
export function googleCalendarUrl(day: ScheduleDay): string {
  const start = compactDate(day.date);
  const end = compactDate(addDays(day.date, 1));
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: daySummary(day),
    dates: `${start}/${end}`,
    details: dayDescription(day),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Triggers a browser download of the schedule as an .ics file. */
export function downloadIcs(schedule: GeneratedSchedule, name: string): void {
  const ics = buildIcs(schedule, name);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "schedule"}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
