-- Movie ratings, one row per user per title.
--
-- Each user's rating is its own row instead of a single shared "average" field on titles. That
-- means concurrent ratings from different users never race each other or need locking to combine:
-- there's nothing shared to read-modify-write. Postgres already guarantees the per-row upsert
-- (unique constraint + ON CONFLICT) is atomic, and the average shown to users is just computed live
-- with AVG()/COUNT() over these rows whenever it's read.
create table public.title_ratings (
  user_id    uuid not null references public.users(id) on delete cascade,
  title_id   text not null references public.titles(id) on delete cascade,
  rating     smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, title_id)
);

create trigger title_ratings_set_updated_at
  before update on public.title_ratings
  for each row execute function public.set_updated_at();

create index title_ratings_title_idx on public.title_ratings (title_id);

alter table public.title_ratings enable row level security;
revoke all on public.title_ratings from anon, authenticated;

-- One-time "you can rate movies now" banner, shown once per user until dismissed.
alter table public.users add column ratings_notice_seen boolean not null default false;
