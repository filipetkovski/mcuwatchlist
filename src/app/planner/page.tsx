import type { Metadata } from "next";
import { Planner } from "@/components/planner";
import { getTitles } from "@/lib/titles";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Viewing planner",
  description:
    "Turn the Marvel titles you haven't watched into a week-by-week schedule based on your weekly hours or titles per week and a target finish date.",
  alternates: { canonical: "/planner" },
};

export default async function PlannerPage() {
  const titles = await getTitles();
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Viewing planner</h1>
        <p className="max-w-2xl text-muted">
          Tell us how much time you have. We&apos;ll lay out what to watch and when. Save a plan and it becomes its own
          path with its own checked titles.
        </p>
      </header>
      <Planner titles={titles} />
    </div>
  );
}
