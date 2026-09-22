import type { Importance, Title } from "@/lib/types";

const styles: Record<Importance, string> = {
  essential: "border-accent/50 bg-accent/10 text-accent-text",
  recommended: "border-violet/40 bg-violet/10 text-violet",
  optional: "border-line bg-surface-2 text-muted",
  unconfirmed: "border-warn/40 border-dashed bg-warn/10 text-warn",
};

const labels: Record<Importance, string> = {
  essential: "Essential",
  recommended: "Recommended",
  optional: "Optional",
  unconfirmed: "Unconfirmed",
};

export function ImportanceBadge({ importance }: { importance: Importance }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${styles[importance]}`}>
      {labels[importance]}
    </span>
  );
}

export function DoomsdayBadge({ title }: { title: Title }) {
  if (!title.leads_into_doomsday) return null;
  return (
    <span className="rounded-full border border-good/40 bg-good/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-good">
      Leads to Doomsday
    </span>
  );
}
