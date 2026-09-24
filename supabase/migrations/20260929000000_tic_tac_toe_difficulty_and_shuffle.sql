-- Replace the normal/hard tag with a numeric 1-10 difficulty per question (10 questions per
-- level), and add per-game answer shuffling so the correct option isn't always in the same slot.
alter table public.trivia_questions add column difficulty_level smallint check (difficulty_level between 1 and 10);

-- One-time backfill: split each existing tag into 5 even tiers by physical row order (ctid) -
-- there's no finer per-question difficulty judgment recorded, so this is a reasonable first pass.
with tiers as (
  select id,
    case
      when difficulty = 'normal' then ntile(5) over (partition by difficulty order by ctid)
      else 5 + ntile(5) over (partition by difficulty order by ctid)
    end as level
  from public.trivia_questions
)
update public.trivia_questions t set difficulty_level = tiers.level
from tiers where t.id = tiers.id;

alter table public.trivia_questions alter column difficulty_level set not null;
alter table public.trivia_questions drop column difficulty;

-- Per-game shuffle order: a permutation of [0,1,2,3] mapping the displayed option position to the
-- question's canonical option index, regenerated each time a new question is dealt.
alter table public.tic_tac_toe_games add column question_order jsonb;
