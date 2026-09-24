-- Ratings move from a 1-5 star integer to a continuous 1.0-5.0 scale (one decimal place).
alter table public.title_ratings
  alter column rating type numeric(3, 1) using rating::numeric(3, 1);

alter table public.title_ratings
  drop constraint if exists title_ratings_rating_check;

alter table public.title_ratings
  add constraint title_ratings_rating_check check (rating >= 1 and rating <= 5);
