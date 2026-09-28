-- Add a "lineup" phase between bidding and result reveal.
-- After all picks are assigned, each player secretly orders their 5 heroes 1-5.
-- Once both submit, position 1 fights position 1, etc. to determine the winner.

alter table public.draft_games
  drop constraint draft_games_status_check;

alter table public.draft_games
  add constraint draft_games_status_check
  check (status in ('pending', 'active', 'lineup', 'finished', 'declined'));

alter table public.draft_games
  add column lineup_x text[] default null,
  add column lineup_o text[] default null;
