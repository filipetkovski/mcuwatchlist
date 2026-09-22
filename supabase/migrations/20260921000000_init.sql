-- MCU Watchlist schema (shared, single-password site for two people).
-- Apply with `npm run db:setup`, which runs every file in this folder once.
--
-- Access model: there are no per-user accounts. Everything except the public `titles` catalog is
-- reachable only through the app's server routes using the service-role key, after the password
-- gate. RLS is enabled with no policies on those tables so the public (anon) key can't read them.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- titles: public, read-only catalog
-- ---------------------------------------------------------------------------
create table public.titles (
  id                  text primary key,
  title               text not null,
  type                text not null check (type in ('movie', 'tv', 'special')),
  release_date        date not null,
  story_order_index   integer not null unique,
  runtime_minutes     integer not null check (runtime_minutes > 0),
  universe            text not null default 'mcu' check (universe in ('mcu', 'non_marvel_studios')),
  importance          text not null check (importance in ('essential', 'recommended', 'optional', 'unconfirmed')),
  poster_url          text,
  leads_into_doomsday boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index titles_release_idx on public.titles (release_date, story_order_index);

create trigger titles_set_updated_at
  before update on public.titles
  for each row execute function public.set_updated_at();

alter table public.titles enable row level security;

create policy "titles are publicly readable"
  on public.titles for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- site_password: exactly one row holding the hash of the shared password
-- ---------------------------------------------------------------------------
create table public.site_password (
  id            boolean primary key default true check (id),
  password_hash text not null,
  updated_at    timestamptz not null default now()
);

create trigger site_password_set_updated_at
  before update on public.site_password
  for each row execute function public.set_updated_at();

alter table public.site_password enable row level security;

-- ---------------------------------------------------------------------------
-- schedules: saved viewing plans. Each one is also a "path" with its own checked titles.
-- ---------------------------------------------------------------------------
create table public.schedules (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null check (char_length(name) between 1 and 60),
  weekly_hours       numeric(6, 2) check (weekly_hours > 0),
  titles_per_week    numeric(6, 2) check (titles_per_week > 0),
  target_finish_date date,
  mode               text not null default 'strict' check (mode in ('strict', 'flexible')),
  order_type         text not null default 'story' check (order_type in ('story', 'release')),
  generated_schedule jsonb not null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (weekly_hours is not null or titles_per_week is not null)
);

create trigger schedules_set_updated_at
  before update on public.schedules
  for each row execute function public.set_updated_at();

alter table public.schedules enable row level security;

-- ---------------------------------------------------------------------------
-- path_progress: checked titles, kept separately for every path.
-- path_id is a preset slug ('new-to-marvel', 'prepare-for-doomsday', 'rewatch-essentials')
-- or the id of a row in public.schedules. Presence of a row means "watched".
-- ---------------------------------------------------------------------------
create table public.path_progress (
  path_id    text not null check (path_id ~ '^[a-z0-9-]{1,64}$'),
  title_id   text not null references public.titles (id) on delete cascade,
  watched_at timestamptz not null default now(),
  primary key (path_id, title_id)
);

alter table public.path_progress enable row level security;

-- Deleting a saved schedule also forgets what was checked on it.
create or replace function public.delete_schedule_progress()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  delete from public.path_progress where path_id = old.id::text;
  return old;
end;
$$;

create trigger schedules_delete_progress
  after delete on public.schedules
  for each row execute function public.delete_schedule_progress();

-- The public key may only read the catalog.
revoke all on public.site_password from anon, authenticated;
revoke all on public.schedules     from anon, authenticated;
revoke all on public.path_progress from anon, authenticated;
revoke insert, update, delete on public.titles from anon, authenticated;
