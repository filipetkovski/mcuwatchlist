-- Changing room: two users trade album cards directly (N cards for M cards). A room starts
-- 'open' (host waiting), becomes 'active' once a guest joins, and 'completed' once both sides
-- have staged an offer and both confirmed - at which point execute_trade below swaps the cards.
-- A user may only be host or guest of one 'open'/'active' room at a time (enforced in app code,
-- same non-atomic busy-check style already used for tic_tac_toe_games/draft_games).

create table public.trade_rooms (
  id              uuid primary key default gen_random_uuid(),
  host_id         uuid not null references public.users(id) on delete cascade,
  guest_id        uuid references public.users(id) on delete cascade,
  status          text not null default 'open' check (status in ('open', 'active', 'completed', 'cancelled')),
  host_offer      jsonb not null default '[]',
  guest_offer     jsonb not null default '[]',
  host_confirmed  boolean not null default false,
  guest_confirmed boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (host_id <> guest_id)
);

create trigger trade_rooms_set_updated_at
  before update on public.trade_rooms
  for each row execute function public.set_updated_at();

create index trade_rooms_host_id_idx on public.trade_rooms (host_id);
create index trade_rooms_guest_id_idx on public.trade_rooms (guest_id);
create index trade_rooms_status_idx on public.trade_rooms (status);

alter table public.trade_rooms enable row level security;
revoke all on public.trade_rooms from anon, authenticated;

-- Swaps p_host_offer (host -> guest) and p_guest_offer (guest -> host) and marks the room
-- completed, all in one statement. Ownership of the offered cards must already be validated by
-- the caller; album_cards.count's own "check (count >= 0)" constraint is the last line of defense
-- - if a stale offer would go negative, the whole update (and the completed status) rolls back.
create or replace function public.execute_trade(
  p_room_id uuid,
  p_host_id uuid,
  p_guest_id uuid,
  p_host_offer text[],
  p_guest_offer text[]
)
returns boolean
language plpgsql
set search_path = ''
as $$
begin
  update public.trade_rooms
  set status = 'completed'
  where id = p_room_id and status = 'active' and host_confirmed and guest_confirmed;

  if not found then
    return false;
  end if;

  if array_length(p_host_offer, 1) > 0 then
    update public.album_cards ac
    set count = ac.count - x.n
    from (select character_id, count(*) as n from unnest(p_host_offer) as character_id group by character_id) x
    where ac.user_id = p_host_id and ac.character_id = x.character_id;

    insert into public.album_cards as ac (user_id, character_id, count, first_obtained_at)
    select p_guest_id, character_id, count(*), now()
    from unnest(p_host_offer) as character_id
    group by character_id
    on conflict (user_id, character_id) do update set count = ac.count + excluded.count;
  end if;

  if array_length(p_guest_offer, 1) > 0 then
    update public.album_cards ac
    set count = ac.count - x.n
    from (select character_id, count(*) as n from unnest(p_guest_offer) as character_id group by character_id) x
    where ac.user_id = p_guest_id and ac.character_id = x.character_id;

    insert into public.album_cards as ac (user_id, character_id, count, first_obtained_at)
    select p_host_id, character_id, count(*), now()
    from unnest(p_guest_offer) as character_id
    group by character_id
    on conflict (user_id, character_id) do update set count = ac.count + excluded.count;
  end if;

  return true;
end;
$$;
