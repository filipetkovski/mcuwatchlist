-- Combines spend_vibranium + grant_album_cards (and the follow-up balance read) into a single
-- atomic call, so opening a pack is one database round trip instead of three.
create or replace function public.open_pack(p_user_id uuid, p_amount integer, p_character_ids text[])
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_vibranium integer;
  v_pulls jsonb;
begin
  update public.users set vibranium = vibranium - p_amount
  where id = p_user_id and vibranium >= p_amount
  returning vibranium into v_vibranium;

  if not found then
    raise exception 'insufficient_vibranium';
  end if;

  with granted as (
    insert into public.album_cards as ac (user_id, character_id, count, first_obtained_at)
    select p_user_id, cid, 1, now()
    from unnest(p_character_ids) as cid
    on conflict (user_id, character_id)
    do update set count = ac.count + 1
    returning ac.character_id, (ac.count = 1) as is_new
  )
  select jsonb_agg(jsonb_build_object('character_id', character_id, 'is_new', is_new))
  into v_pulls
  from granted;

  return jsonb_build_object('vibranium', v_vibranium, 'pulls', v_pulls);
end;
$$;

-- Superseded by open_pack above - the two-step spend-then-grant dance is gone.
drop function if exists public.spend_vibranium(uuid, integer);
drop function if exists public.grant_album_cards(uuid, text[]);
