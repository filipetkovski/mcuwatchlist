-- Atomically sells all duplicate album cards (count > 1) for p_price_each vibranium per copy.
-- Resets each affected card's count to 1 and credits the user in a single transaction.
-- Returns the total vibranium earned (0 if the user had no duplicates).
create or replace function public.sell_duplicates(p_user_id uuid, p_price_each integer)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_earned integer;
begin
  select coalesce(sum(count - 1), 0) * p_price_each
  into v_earned
  from public.album_cards
  where user_id = p_user_id and count > 1;

  if v_earned = 0 then
    return 0;
  end if;

  update public.album_cards
  set count = 1, updated_at = now()
  where user_id = p_user_id and count > 1;

  update public.users
  set vibranium = vibranium + v_earned
  where id = p_user_id;

  return v_earned;
end;
$$;
