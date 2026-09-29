import Link from "next/link";
import { AlbumIcon } from "@/components/album-icon";
import { CaptainAmericaShield } from "@/components/captain-america-shield";
import { Countdown } from "@/components/countdown";
import { PathCards } from "@/components/path-cards";
import { TicTacToeIcon } from "@/components/tic-tac-toe-icon";
import { DraftIcon } from "@/components/draft-icon";
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
        <ul className="grid gap-4 md:grid-cols-3">
          <li>
            <Link
              href="/tic-tac-toe"
              className="relative flex min-h-56 flex-col overflow-hidden comic-panel p-5 transition-transform hover:-translate-y-0.5"
              style={{ background: "linear-gradient(160deg, #1f8a4f 0%, #0f5a33 55%, #08301c 100%)" }}
            >
              <TicTacToeIcon className="pointer-events-none absolute -bottom-6 -right-6 h-40 w-40 select-none opacity-40" />
              <h3 className="relative font-display text-xl font-semibold">Tic-Tac-Toe</h3>
              <p className="relative mt-1 text-sm font-medium text-[#b8f7cd]">Challenge another fan to a match.</p>
              <p className="relative mt-2 flex-1 text-sm text-white/90">
                Play tic-tac-toe against someone else on the site, answering Marvel trivia to earn each move.
              </p>
            </Link>
          </li>
          <li>
            <Link
              href="/draft"
              className="relative flex min-h-56 flex-col overflow-hidden comic-panel p-5 transition-transform hover:-translate-y-0.5"
              style={{ background: "linear-gradient(160deg, #d22030 0%, #8f0d1a 55%, #4a0710 100%)" }}
            >
              <DraftIcon className="pointer-events-none absolute -bottom-6 -right-6 h-40 w-40 select-none opacity-40" />
              <h3 className="relative font-display text-xl font-semibold">Draft</h3>
              <p className="relative mt-1 text-sm font-medium text-[#ffcf6b]">Bid your $20 on heroes and villains.</p>
              <p className="relative mt-2 flex-1 text-sm text-white/90">
                Take turns bidding for 10 characters. Whoever&apos;s 5 picks add up to the most power wins the draft.
              </p>
            </Link>
          </li>
          <li>
            <Link
              href="/allbum"
              className="relative flex min-h-56 flex-col overflow-hidden comic-panel p-5 transition-transform hover:-translate-y-0.5"
              style={{ background: "linear-gradient(160deg, #07160c 0%, #123a20 55%, #1f5c33 100%)" }}
            >
              <AlbumIcon className="pointer-events-none absolute -bottom-6 -right-6 h-40 w-40 select-none opacity-40" />
              <h3 className="relative font-display text-xl font-semibold">Allbum</h3>
              <p className="relative mt-1 text-sm font-medium text-[#9be8b4]">Collect every hero and villain.</p>
              <p className="relative mt-2 flex-1 text-sm text-white/90">
                Spend vibraniums on Silver, Gold, and Platinum packs, and fill your album one card at a time.
              </p>
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
