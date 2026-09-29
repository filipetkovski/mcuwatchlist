-- Market: sell duplicate album cards to other users for vibraniums. Listing a card escrows one
-- copy out of the seller's album_cards immediately (only allowed when they have a spare - count
-- must be > 1 so their own album page is never put at risk); cancelling returns it.

create table public.market_listings (
  id           uuid primary key default gen_random_uuid(),
  seller_id    uuid not null references public.users(id) on delete cascade,
  character_id text not null,
  price        integer not null check (price > 0 and price <= 50000),
  status       text not null default 'open' check (status in ('open', 'sold', 'cancelled')),
  buyer_id     uuid references public.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger market_listings_set_updated_at
  before update on public.market_listings
  for each row execute function public.set_updated_at();

create index market_listings_status_idx on public.market_listings (status);
create index market_listings_seller_id_idx on public.market_listings (seller_id);

alter table public.market_listings enable row level security;
revoke all on public.market_listings from anon, authenticated;

-- Escrows one spare copy (count > 1) and creates the listing, atomically.
create or replace function public.create_market_listing(p_seller_id uuid, p_character_id text, p_price integer)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
begin
  update public.album_cards
  set count = count - 1
  where user_id = p_seller_id and character_id = p_character_id and count > 1;

  if not found then
    raise exception 'no_duplicate';
  end if;

  insert into public.market_listings (seller_id, character_id, price)
  values (p_seller_id, p_character_id, p_price)
  returning id into v_id;

  return v_id;
end;
$$;

-- Returns the escrowed copy and marks the listing cancelled - only the seller, only while open.
create or replace function public.cancel_market_listing(p_listing_id uuid, p_seller_id uuid)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_character_id text;
begin
  update public.market_listings
  set status = 'cancelled'
  where id = p_listing_id and seller_id = p_seller_id and status = 'open'
  returning character_id into v_character_id;

  if not found then
    return false;
  end if;

  update public.album_cards set count = count + 1
  where user_id = p_seller_id and character_id = v_character_id;

  return true;
end;
$$;

-- Pays the seller, grants the card to the buyer, and closes the listing - all atomically.
create or replace function public.buy_market_listing(p_listing_id uuid, p_buyer_id uuid)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_seller_id uuid;
  v_character_id text;
  v_price integer;
  v_buyer_vibranium integer;
  v_is_new boolean;
begin
  update public.market_listings
  set status = 'sold', buyer_id = p_buyer_id
  where id = p_listing_id and status = 'open' and seller_id <> p_buyer_id
  returning seller_id, character_id, price into v_seller_id, v_character_id, v_price;

  if not found then
    raise exception 'listing_unavailable';
  end if;

  update public.users set vibranium = vibranium - v_price
  where id = p_buyer_id and vibranium >= v_price
  returning vibranium into v_buyer_vibranium;

  if not found then
    raise exception 'insufficient_vibranium';
  end if;

  update public.users set vibranium = vibranium + v_price where id = v_seller_id;

  insert into public.album_cards as ac (user_id, character_id, count, first_obtained_at)
  values (p_buyer_id, v_character_id, 1, now())
  on conflict (user_id, character_id)
  do update set count = ac.count + 1
  returning (ac.count = 1) into v_is_new;

  return jsonb_build_object('vibranium', v_buyer_vibranium, 'characterId', v_character_id, 'isNew', v_is_new);
end;
$$;
