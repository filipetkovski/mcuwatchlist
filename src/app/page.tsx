import Link from "next/link";
import { Countdown } from "@/components/countdown";
import { Dashboard } from "@/components/dashboard";
import { PathCards } from "@/components/path-cards";
import { PATHS } from "@/lib/paths";
import { getTitles } from "@/lib/titles";

export const revalidate = 3600;

export default async function HomePage() {
  const titles = await getTitles();
  const mcu = titles.filter(PATHS[0].include);

  return (
    <div className="space-y-12 pt-4 sm:pt-10">
      <Countdown />
      <section className="space-y-5">
        <h1 className="max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
          Get caught up before <span className="text-[#1f8a4f]">Doomsday</span>.
        </h1>
        <p className="max-w-2xl text-lg text-muted">
          Check off what you&apos;ve seen, choose story or release order, and turn the rest into a weekly viewing plan
          that actually fits your schedule. Everything is saved to your shared account.
        </p>
      </section>

      <section aria-labelledby="paths-heading" className="space-y-4">
        <h2 id="paths-heading" className="font-display text-2xl font-semibold">
          Pick your path
        </h2>
        <PathCards titles={titles} />
      </section>
    </div>
  );
}
