# MCU Watchlist

A Marvel Cinematic Universe watch-order tracker for getting ready for **Avengers: Doomsday**, built for two people
sharing one password.

- Check off what you've watched, in **story order** or **release order**.
- Pick a **path**: New to Marvel, Prepare for Doomsday, Rewatch the Essentials, or any schedule you've saved.
  Every path keeps its **own** checked titles.
- Turn what's left into a **week-by-week viewing plan** from your weekly hours (or titles per week) and an optional
  target date. Save it and it becomes a path too.
- A password popup guards the site; a correct password keeps you logged in for **1 hour**.

Built with Next.js 16 (App Router, TypeScript), Tailwind CSS v4 and Supabase (Postgres). Red-and-blue comic styling.

> Unofficial fan project. Not affiliated with, endorsed by, or connected to Marvel, Marvel Studios or The Walt Disney
> Company. All copy, layout and styling are original.

---

## Quick start

Requires Node 24+ (the scripts run TypeScript directly) and a free [Supabase](https://supabase.com) project.

```bash
npm install
```

### 1. Get your Supabase values

In the Supabase dashboard:

| Value | Where to find it |
| --- | --- |
| Project URL | Project Settings -> API -> **Project URL**, e.g. `https://abcdefgh.supabase.co` |
| Service role key | Project Settings -> API -> the **secret** key (`service_role` / `sb_secret_...`). Not the anon/publishable key. |
| Access token | Account (avatar) -> **Access Tokens** -> Generate new token, starts with `sbp_`. Shown once. |

### 2. Fill in `.env.local`

```env
SUPABASE_URL=https://abcdefgh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_ACCESS_TOKEN=sbp_...
SITE_PASSWORD=the-shared-password
SESSION_SECRET=a-random-string-of-32-or-more-characters
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- Use the bare project URL. A trailing `/rest/v1/` is ignored, but don't rely on it.
- `SESSION_SECRET` signs the login cookie. Generate one with
  `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.
- The file is git-ignored. `.env.local.example` shows the shape.
- The service role key and access token grant full access to your project. Keep them private.

### 3. Create the tables

```bash
npm run db:setup
```

This applies `supabase/migrations/*.sql` (each file once), loads the title catalog, and stores a **hash** of
`SITE_PASSWORD`. Once it prints `Done` you can blank `SITE_PASSWORD` in `.env.local`.

### 4. Run it

```bash
npm run dev
```

Open http://localhost:3000 and enter the password. Restart the dev server whenever you change `.env.local`.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve it |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript checks |
| `npm run db:setup` | Create tables, load titles, set the password (safe to re-run) |
| `npm run db:setup -- --reset-password` | Also replace the stored password with the current `SITE_PASSWORD` |
| `npm run seed:generate` | Regenerate `supabase/seed.sql` from `src/data/titles.ts` |
| `npm run check:schedule` | Sanity checks for the scheduler |
| `npm run check:auth` | Sanity checks for password hashing |

**Change the password:** set a new `SITE_PASSWORD`, run `npm run db:setup -- --reset-password`.

**Edit the catalog:** change `src/data/titles.ts`, then run `npm run db:setup` to push it to Supabase.

---

## How it works

### Password gate

A popup blocks the site until unlocked. `POST /api/session` checks the password against a scrypt hash stored in the
one-row `site_password` table, then sets a signed, `httpOnly` cookie that expires after 1 hour. When it expires (or you
press **Lock**) the popup returns. Wrong guesses are slowed down and an address is locked out for 15 minutes after 5
misses (best-effort, per server instance).

### Data access

The browser never talks to Supabase. Progress and schedules are only reachable through `/api/*` routes that require the
session cookie, using the service-role key on the server. Row-level security is enabled on every table with no policies
for the public key, so the public API key can read nothing except the `titles` catalog.

### Paths and progress

| Path | Titles |
| --- | --- |
| New to Marvel | All MCU titles (optionally include non-Marvel Studios films) |
| Prepare for Doomsday | MCU titles flagged `leads_into_doomsday` that are essential or recommended |
| Rewatch the Essentials | MCU titles rated essential |
| Saved schedules | Whatever titles the plan covers |

Checked titles are stored per path in `path_progress (path_id, title_id)`. Choose a path with the chips on the
**Watch order** page (`?path=<id>` in the URL). Deleting a saved schedule also deletes its checked titles.

### Planner

`src/lib/schedule.ts` is a pure function that spreads the unwatched titles across your viewing days.

- **Pace:** hours per week or titles per week. Leave it blank with a target date and it works out the pace needed.
- **Strict:** exact order. A long title can spill into later sessions' time.
- **Flexible:** nearby titles may swap places so each session fits your time, never by more than a few spots.

Preview a plan, then **Save as path**. Saved plans can be recalculated (shifts what's left forward from today) or
deleted.

### Static pages and SEO

`/`, `/planner` and `/watch-order/[order]` are statically generated with hourly ISR, so the full title list is in the
HTML. Checklists, the dashboard and the planner are client components that load your data after unlocking.

---

## Project structure

```
src/
  app/
    page.tsx                   home: countdown, path cards, dashboard
    watch-order/[order]/       story / release list pages (ISR)
    planner/                   viewing planner
    api/session|progress|schedules   password-guarded routes
  components/                  UI (app-provider holds session, progress, schedules)
  lib/
    schedule.ts                scheduler
    session.ts, password.ts    signed cookie + scrypt hashing
    paths.ts                   path definitions and the Doomsday release date
    supabase/                  server-side clients and config
  data/titles.ts               the title catalog (source of truth for the seed)
supabase/
  migrations/                  schema (tables, RLS, triggers)
  seed.sql                     generated from src/data/titles.ts
scripts/                       db-setup, seed generator, sanity checks
```

### Database tables

| Table | Purpose |
| --- | --- |
| `titles` | Public catalog: title, type, release date, story order, runtime, universe, importance, poster, Doomsday flag |
| `site_password` | Exactly one row: the password hash |
| `schedules` | Saved plans (name, pace, mode, order, target date, generated schedule JSON) |
| `path_progress` | Checked titles per path |

---

## Troubleshooting

**"Couldn't check the password. Is the database set up?"**
Run `npm run db:setup`, and check that `SUPABASE_URL` is the bare project URL and `SUPABASE_SERVICE_ROLE_KEY` is the
secret key. Restart the dev server after any `.env.local` change.

**"The server isn't configured yet"**
One of `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` or `SESSION_SECRET` is empty. If your editor has `.env.local` open,
reload it before saving so an old copy doesn't overwrite your changes.

**Port 3000 is in use**
Next will pick 3001. A previous dev or production server may still be running.

---

## Notes on the catalog

Importance ratings and Doomsday links are editorial opinions based on public announcements, not official guidance. TV
runtimes are approximate season totals. Titles released or announced in 2026 are marked *unconfirmed*; verify their
dates and runtimes in `src/data/titles.ts`. Poster images come from TMDB: run `npm run posters:fetch` (needs
`TMDB_API_KEY` in `.env.local`, get a free key at themoviedb.org/settings/api) to (re)populate `src/data/posters.ts`.
Titles without a match keep the initials placeholder in the UI.
