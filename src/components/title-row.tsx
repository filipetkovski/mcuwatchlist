import { formatDay } from "@/lib/dates";
import { formatRuntime, releaseYear } from "@/lib/format";
import type { Title, TitleRating, TitleType } from "@/lib/types";
import { DoomsdayBadge, ImportanceBadge } from "./badges";

const TYPE_LABEL: Record<TitleType, string> = { movie: "Movie", tv: "TV", special: "Special" };
const NO_RATING: TitleRating = { average: null, count: 0, mine: null };

export function TitleRow({
  title: t,
  position,
  watched,
  skipped = false,
  rating = NO_RATING,
  date,
  isToday = false,
  calendarUrl,
  onToggle,
  onSkip,
  onRate,
}: {
  title: Title;
  position?: number;
  watched: boolean;
  skipped?: boolean;
  rating?: TitleRating;
  /** ISO date this title is scheduled to be watched on, if shown inside a viewing plan. */
  date?: string;
  isToday?: boolean;
  /** Link to add this title's viewing date to Google Calendar; shown as an icon next to the date. */
  calendarUrl?: string;
  onToggle?: (watched: boolean) => void;
  onSkip?: () => void;
  onRate?: () => void;
}) {
  const interactive = Boolean(onToggle);
  const showRateButton = watched && !skipped && Boolean(onRate) && rating.mine === null;
  const rowStyle = watched
    ? { borderColor: "#1f8a4f", backgroundColor: "rgb(31 138 79 / 0.4)" }
    : skipped
      ? { borderColor: "#b91c1c", backgroundColor: "rgb(185 28 28 / 0.15)" }
      : undefined;

  return (
    <li
      role={interactive ? "checkbox" : "listitem"}
      aria-checked={interactive ? watched : undefined}
      aria-label={interactive ? `Mark ${t.title} as watched` : t.title}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? () => { if (!skipped) onToggle!(!watched); } : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (!skipped) onToggle!(!watched);
              }
            }
          : undefined
      }
      className={`group flex items-stretch overflow-hidden comic-panel transition-colors ${interactive ? "cursor-pointer" : ""} ${
        interactive && !watched && !skipped ? "hover:border-muted/60" : ""
      }`}
      style={rowStyle}
    >
      <div className="relative shrink-0 self-stretch">
        <Poster title={t} />
        {watched && (
          <div className="pointer-events-none absolute inset-0 bg-emerald-500/50" />
        )}
        {skipped && (
          <div className="pointer-events-none absolute inset-0 bg-red-600/40" />
        )}
        {position !== undefined && (
          <span className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-black bg-surface-2 font-mono text-[10px] tabular-nums text-muted shadow-[2px_2px_0_#000]">
            {position}
          </span>
        )}
        <RatingBadge rating={rating} />
      </div>
      <div className="flex min-w-0 flex-1 items-center py-2 pl-3 pr-2 sm:py-2.5 sm:pl-4 sm:pr-2.5">
        <div className="min-w-0 flex-1">
          <span className={`block font-display text-base font-semibold leading-snug sm:text-lg ${watched || skipped ? "line-through decoration-muted" : ""}`}>
            {t.title}
          </span>
          <span className="mt-0.5 block text-xs text-muted sm:text-sm">
            {TYPE_LABEL[t.type]} · {releaseYear(t.release_date)} · {formatRuntime(t.runtime_minutes)}
            {date && (
              <>
                {" · "}
                <span className={isToday ? "font-semibold text-accent-text" : undefined}>
                  {formatDay(date, { month: "short", day: "numeric" })}
                  {isToday ? " (today)" : ""}
                </span>
                {calendarUrl && (
                  <a
                    href={calendarUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Add ${formatDay(date, { month: "short", day: "numeric" })} to Google Calendar`}
                    title="Add to Google Calendar"
                    className="ml-1 inline-flex align-middle text-muted hover:text-accent-text"
                  >
                    <CalendarGlyph className="inline-block h-3 w-3" />
                  </a>
                )}
              </>
            )}
            {!date && t.universe === "non_marvel_studios" && " · Non-Marvel Studios"}
          </span>
          <span className="mt-1.5 flex flex-wrap gap-1.5 items-center">
            <ImportanceBadge importance={t.importance} />
            <DoomsdayBadge title={t} />
          </span>
        </div>
        {!watched && onSkip && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSkip(); }}
            aria-label={skipped ? `Undo skip for ${t.title}` : `Skip ${t.title}`}
            className={`ml-3 shrink-0 rounded border-2 border-black px-2.5 py-1 font-display text-xs font-black uppercase tracking-wide shadow-[2px_2px_0_#000] transition-colors ${
              skipped
                ? "bg-surface-2 text-muted hover:bg-surface-2/80"
                : "bg-yellow-400 text-black hover:bg-yellow-300"
            }`}
          >
            {skipped ? "UNDO" : "SKIP!"}
          </button>
        )}
        {showRateButton && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRate!(); }}
            aria-label={`Rate ${t.title}`}
            className="ml-3 shrink-0 rounded border-2 border-black bg-violet px-2.5 py-1 font-display text-xs font-black uppercase tracking-wide text-white shadow-[2px_2px_0_#000] transition-colors hover:bg-violet/80"
          >
            Rate
          </button>
        )}
      </div>
    </li>
  );
}

function RatingBadge({ rating }: { rating: TitleRating }) {
  if (rating.count === 0 || rating.average === null) {
    return (
      <span
        title="N/A"
        className="absolute right-1 top-1 flex h-5 items-center rounded-full border-2 border-black bg-surface-2 px-1.5 font-mono text-[10px] font-medium text-muted shadow-[2px_2px_0_#000]"
      >
        N/A
      </span>
    );
  }
  return (
    <span
      title={`${rating.average.toFixed(1)} average from ${rating.count} rating${rating.count === 1 ? "" : "s"}`}
      className="absolute right-1 top-1 flex h-5 items-center gap-0.5 rounded-full border-2 border-black bg-yellow-400 px-1.5 font-mono text-[10px] font-bold tabular-nums text-black shadow-[2px_2px_0_#000]"
    >
      ★ {rating.average.toFixed(1)}
    </span>
  );
}

function CalendarGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" className={className}>
      <rect x="3.5" y="5" width="17" height="15" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M3.5 9.5h17M8 3v3.5M16 3v3.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function Poster({ title }: { title: Title }) {
  if (title.poster_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={title.poster_url}
        alt=""
        loading="lazy"
        className="h-full w-25 shrink-0 border-r-2 border-black object-cover sm:w-25"
      />
    );
  }
  const initials = title.title
    .replace(/[^A-Za-z0-9 ]/g, "")
    .split(" ")
    .filter((w) => w.length > 2 || /^\d/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <div
      aria-hidden="true"
      className="flex h-full w-20 shrink-0 items-center justify-center border-r-2 border-black bg-gradient-to-br from-surface-2 to-line font-display text-xs font-bold text-muted sm:w-25 sm:text-base"
    >
      {initials || "M"}
    </div>
  );
}
