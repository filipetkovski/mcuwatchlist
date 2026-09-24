-- Users must explicitly join before they're listed on the tic-tac-toe leaderboard or can be
-- challenged. Also: a one-time "you can play tic-tac-toe now" notice, same idea as
-- ratings_notice_seen.
alter table public.users add column tic_tac_toe_joined boolean not null default false;
alter table public.users add column tic_tac_toe_notice_seen boolean not null default false;
