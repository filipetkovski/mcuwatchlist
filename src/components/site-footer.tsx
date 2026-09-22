export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-line">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 text-sm text-muted sm:px-6">
        <p className="font-display text-base font-semibold text-ink">MCU Watchlist</p>
        <p className="mt-2 max-w-3xl">
          This is an unofficial fan project. It is not affiliated with, endorsed by, or connected to Marvel,
          Marvel Studios, or The Walt Disney Company. Marvel, the Marvel Cinematic Universe, and all related
          titles and characters are trademarks of their respective owners.
        </p>
        <p className="mt-2 max-w-3xl">
          Importance ratings and Doomsday links are editorial opinions based on public announcements and may
          change. TV runtimes are approximate season totals.
        </p>
      </div>
    </footer>
  );
}
