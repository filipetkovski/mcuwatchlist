-- Replace single site_password with per-user accounts.
-- Drops site_password, adds users table, rebuilds path_progress and schedules with user_id.

drop table if exists public.site_password cascade;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
create table public.users (
  id            uuid primary key default gen_random_uuid(),
  username      text not null unique check (char_length(username) between 1 and 50),
  password_hash text not null,
  role          text not null default 'user' check (role in ('admin', 'user')),
  path_id       text check (path_id is null or path_id in ('new-to-marvel', 'prepare-for-doomsday', 'rewatch-essentials')),
  created_at    timestamptz not null default now()
);

alter table public.users enable row level security;
revoke all on public.users from anon, authenticated;

-- ---------------------------------------------------------------------------
-- path_progress (rebuilt with user_id)
-- ---------------------------------------------------------------------------
drop table if exists public.path_progress cascade;

create table public.path_progress (
  user_id    uuid not null references public.users(id) on delete cascade,
  path_id    text not null check (path_id ~ '^[a-z0-9-]{1,64}$'),
  title_id   text not null references public.titles(id) on delete cascade,
  watched_at timestamptz not null default now(),
  primary key (user_id, path_id, title_id)
);

alter table public.path_progress enable row level security;
revoke all on public.path_progress from anon, authenticated;

-- ---------------------------------------------------------------------------
-- schedules (rebuilt with user_id; one per user enforced by unique index)
-- ---------------------------------------------------------------------------
drop table if exists public.schedules cascade;

create table public.schedules (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null unique references public.users(id) on delete cascade,
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
revoke all on public.schedules from anon, authenticated;

-- Deleting a schedule also removes its checked titles from path_progress.
create or replace function public.delete_schedule_progress()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  delete from public.path_progress where user_id = old.user_id and path_id = old.id::text;
  return old;
end;
$$;

create trigger schedules_delete_progress
  after delete on public.schedules
  for each row execute function public.delete_schedule_progress();
