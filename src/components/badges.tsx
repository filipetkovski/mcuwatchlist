import type { Importance, Title } from "@/lib/types";

const styles: Record<Importance, string> = {
  essential: "border-2 border-black bg-red-500 text-white shadow-[2px_2px_0_#000] font-black",
  recommended: "border-2 border-black bg-yellow-400 text-black shadow-[2px_2px_0_#000] font-black",
  optional: "border-2 border-black bg-surface-2 text-muted shadow-[1px_1px_0_#000] font-bold",
  unconfirmed: "border-2 border-dashed border-black bg-warn/20 text-warn font-bold",
};

const labels: Record<Importance, string> = {
  essential: "Essential",
  recommended: "Recommended",
  optional: "Optional",
  unconfirmed: "Unconfirmed",
};

export function ImportanceBadge({ importance }: { importance: Importance }) {
  return (
    <span className={`rounded px-2 py-0.5 text-[11px] uppercase tracking-wide font-display ${styles[importance]}`}>
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
