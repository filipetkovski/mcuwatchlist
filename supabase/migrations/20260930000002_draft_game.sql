-- "Draft": two players take turns bidding from a $20 budget to win 10 randomly-picked heroes and
-- villains (5 each). Whoever runs out of picks first hands the rest to the other player for free.
-- The character catalog itself lives in code (src/data/draft-characters.ts), not the database -
-- only game state is stored here, same reasoning as the titles catalog vs. path_progress.

alter table public.users add column draft_joined boolean not null default false;
alter table public.users add column draft_notice_seen boolean not null default false;

create table public.draft_games (
  id             uuid primary key default gen_random_uuid(),
  player_x       uuid not null references public.users(id) on delete cascade,
  player_o       uuid not null references public.users(id) on delete cascade,
  status         text not null default 'pending' check (status in ('pending', 'active', 'finished', 'declined')),
  character_ids  text[] not null default '{}',
  round          integer not null default 0,
  first_bidder   uuid references public.users(id) on delete cascade,
  turn           uuid references public.users(id) on delete cascade,
  current_bid    integer not null default 0,
  current_bidder uuid references public.users(id) on delete cascade,
  budget_x       integer not null default 20,
  budget_o       integer not null default 20,
  picks_x        jsonb not null default '[]',
  picks_o        jsonb not null default '[]',
  winner         uuid references public.users(id) on delete cascade,
  result         text check (result in ('win', 'draw')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (player_x <> player_o)
);

create trigger draft_games_set_updated_at
  before update on public.draft_games
  for each row execute function public.set_updated_at();

create index draft_games_player_x_idx on public.draft_games (player_x);
create index draft_games_player_o_idx on public.draft_games (player_o);

alter table public.draft_games enable row level security;
revoke all on public.draft_games from anon, authenticated;
