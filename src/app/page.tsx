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
    <div className="space-y-12">
      <section className="space-y-5 pt-4 sm:pt-10">
        <Countdown />
        <h1 className="max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
          Get caught up before <span className="text-accent-text">Doomsday</span>.
        </h1>
        <p className="max-w-2xl text-lg text-muted">
          Check off what you&apos;ve seen, choose story or release order, and turn the rest into a weekly viewing plan
          that actually fits your schedule. Everything is saved to your shared account.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/watch-order/story?path=prepare-for-doomsday" className="rounded-lg comic-btn bg-accent px-5 py-2.5 font-semibold text-accent-ink transition-opacity hover:opacity-90">
            Start with Doomsday prep
          </Link>
          <Link href="/planner" className="rounded-lg border border-line px-5 py-2.5 font-semibold transition-colors hover:bg-surface-2">
            Plan my viewing
          </Link>
        </div>
      </section>

      <section aria-labelledby="paths-heading" className="space-y-4">
        <h2 id="paths-heading" className="font-display text-2xl font-semibold">
          Pick your path
        </h2>
        <PathCards titles={titles} />
      </section>

      <section className="space-y-4">
        <Dashboard titles={mcu} label="New to Marvel" pathId="new-to-marvel" />
      </section>

      <section aria-labelledby="order-heading" className="space-y-4">
        <h2 id="order-heading" className="font-display text-2xl font-semibold">
          Browse the full list
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/watch-order/story" className="comic-panel p-5 transition-colors hover:border-muted">
            <h3 className="font-display text-lg font-semibold">Story order</h3>
            <p className="mt-1 text-sm text-muted">Follow the timeline of events as they happen in-universe.</p>
          </Link>
          <Link href="/watch-order/release" className="comic-panel p-5 transition-colors hover:border-muted">
            <h3 className="font-display text-lg font-semibold">Release order</h3>
            <p className="mt-1 text-sm text-muted">Watch in the order audiences first saw everything.</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
