-- Allbum: a collectible sticker album of the draft-game characters. Packs are bought with
-- vibraniums (the same currency earned from Tic-Tac-Toe and Draft) and contain 5 distinct
-- characters. A character's first copy fills its album page; further copies are duplicates.

create table public.album_cards (
  user_id            uuid not null references public.users(id) on delete cascade,
  character_id       text not null,
  count              integer not null default 0 check (count >= 0),
  first_obtained_at  timestamptz,
  updated_at         timestamptz not null default now(),
  primary key (user_id, character_id)
);

create trigger album_cards_set_updated_at
  before update on public.album_cards
  for each row execute function public.set_updated_at();

alter table public.album_cards enable row level security;
revoke all on public.album_cards from anon, authenticated;

-- Atomically deducts a pack's cost only if the player can afford it; returns whether it went
-- through, same read-nothing-in-application-code reasoning as adjust_vibranium.
create or replace function public.spend_vibranium(p_user_id uuid, p_amount integer)
returns boolean
language plpgsql
set search_path = ''
as $$
begin
  update public.users set vibranium = vibranium - p_amount
  where id = p_user_id and vibranium >= p_amount;
  return found;
end;
$$;

-- Grants a batch of pulled characters in one atomic statement: a first copy inserts the card at
-- count 1 (placed in the album), a repeat pull increments count (tracked as a duplicate). Returns
-- which of the pulled characters were new.
create or replace function public.grant_album_cards(p_user_id uuid, p_character_ids text[])
returns table(character_id text, is_new boolean)
language sql
set search_path = ''
as $$
  insert into public.album_cards as ac (user_id, character_id, count, first_obtained_at)
  select p_user_id, cid, 1, now()
  from unnest(p_character_ids) as cid
  on conflict (user_id, character_id)
  do update set count = ac.count + 1
  returning ac.character_id, (ac.count = 1);
$$;
