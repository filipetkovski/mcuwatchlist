-- Forfeit rules: 3 missed turns (no answer submitted before the timer runs out) loses the game
-- for whoever missed them; 3 wrong answers from either player ends the game as a draw.
alter table public.tic_tac_toe_games add column miss_count_x smallint not null default 0;
alter table public.tic_tac_toe_games add column miss_count_o smallint not null default 0;
alter table public.tic_tac_toe_games add column wrong_count_x smallint not null default 0;
alter table public.tic_tac_toe_games add column wrong_count_o smallint not null default 0;
