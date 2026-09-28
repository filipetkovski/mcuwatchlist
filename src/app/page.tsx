import Link from "next/link";
import { CaptainAmericaShield } from "@/components/captain-america-shield";
import { Countdown } from "@/components/countdown";
import { PathCards } from "@/components/path-cards";
import { TicTacToeIcon } from "@/components/tic-tac-toe-icon";
import { getTitles } from "@/lib/titles";

export const revalidate = 3600;

export default async function HomePage() {
  const titles = await getTitles();

  return (
    <div className="space-y-12 pt-4 sm:pt-10">
      <section className="space-y-5">
        <h1 className="max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
          Get caught up before <span className="text-[#1f8a4f]">Doomsday</span>.
        </h1>
      </section>

      <Countdown />

      <section aria-labelledby="paths-heading" className="space-y-4">
        <h2 id="paths-heading" className="font-display text-2xl font-semibold">
          Your path
        </h2>
        <PathCards titles={titles} />
      </section>

      <section aria-labelledby="planner-heading" className="space-y-4">
        <h2 id="planner-heading" className="font-display text-2xl font-semibold">
          Planner
        </h2>
        <ul className="grid gap-4">
          <li>
            <Link
              href="/planner"
              className="relative flex min-h-56 flex-col overflow-hidden comic-panel p-5 transition-transform hover:-translate-y-0.5"
              style={{ background: "linear-gradient(160deg, #4d9bff 0%, #2e6fd9 55%, #123a73 100%)" }}
            >
              <CaptainAmericaShield className="pointer-events-none absolute -bottom-10 -right-10 h-56 w-56 select-none opacity-40" />
              <h3 className="relative font-display text-xl font-semibold">Plan my viewing</h3>
              <p className="relative mt-1 text-sm font-medium text-[#cfe8ff]">A weekly schedule that fits your week.</p>
              <p className="relative mt-2 flex-1 text-sm text-white/90">
                Set your pace, pick your viewing days, and turn what&apos;s left into a plan you can check off as you go.
              </p>
            </Link>
          </li>
        </ul>
      </section>

      <section aria-labelledby="games-heading" className="space-y-4">
        <h2 id="games-heading" className="font-display text-2xl font-semibold">
          Games
        </h2>
        <ul className="grid gap-4">
          <li>
            <Link
              href="/tic-tac-toe"
              className="relative flex min-h-56 flex-col overflow-hidden comic-panel p-5 transition-transform hover:-translate-y-0.5"
              style={{ background: "linear-gradient(160deg, #8a5cf6 0%, #5b21b6 55%, #2e1065 100%)" }}
            >
              <TicTacToeIcon className="pointer-events-none absolute -bottom-6 -right-6 h-40 w-40 select-none opacity-40" />
              <h3 className="relative font-display text-xl font-semibold">Tic-Tac-Toe</h3>
              <p className="relative mt-1 text-sm font-medium text-[#e4d4ff]">Challenge another fan to a match.</p>
              <p className="relative mt-2 flex-1 text-sm text-white/90">
                Play tic-tac-toe against someone else on the site, answering Marvel trivia to earn each move.
              </p>
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
