-- Trivia tic-tac-toe: two users play 3x3, but claiming a square requires answering a Marvel
-- trivia question first. Vibraniums are the in-app currency: +100 for a win, -50 for a loss,
-- -10 each for a draw.

alter table public.users add column vibranium integer not null default 0;

-- ---------------------------------------------------------------------------
-- trivia_questions: fixed bank of 50 multiple-choice Marvel questions.
-- ---------------------------------------------------------------------------
create table public.trivia_questions (
  id            uuid primary key default gen_random_uuid(),
  question      text not null,
  options       jsonb not null,
  correct_index smallint not null check (correct_index between 0 and 3)
);

alter table public.trivia_questions enable row level security;
revoke all on public.trivia_questions from anon, authenticated;

-- ---------------------------------------------------------------------------
-- tic_tac_toe_games
-- ---------------------------------------------------------------------------
create table public.tic_tac_toe_games (
  id                   uuid primary key default gen_random_uuid(),
  player_x             uuid not null references public.users(id) on delete cascade,
  player_o             uuid not null references public.users(id) on delete cascade,
  board                jsonb not null default '[null,null,null,null,null,null,null,null,null]',
  status               text not null default 'pending' check (status in ('pending', 'active', 'finished', 'declined')),
  turn                 uuid references public.users(id) on delete cascade,
  winner               uuid references public.users(id) on delete cascade,
  result               text check (result in ('win', 'draw')),
  current_question_id  uuid references public.trivia_questions(id),
  question_deadline    timestamptz,
  used_question_ids    uuid[] not null default '{}',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (player_x <> player_o)
);

create trigger tic_tac_toe_games_set_updated_at
  before update on public.tic_tac_toe_games
  for each row execute function public.set_updated_at();

create index tic_tac_toe_games_player_x_idx on public.tic_tac_toe_games (player_x);
create index tic_tac_toe_games_player_o_idx on public.tic_tac_toe_games (player_o);

alter table public.tic_tac_toe_games enable row level security;
revoke all on public.tic_tac_toe_games from anon, authenticated;

-- Single-statement, atomic balance change - safe under concurrent games finishing at once,
-- same reasoning as title_ratings: nothing is read-modify-written in application code.
create or replace function public.adjust_vibranium(p_user_id uuid, p_delta integer)
returns void
language sql
set search_path = ''
as $$
  update public.users set vibranium = vibranium + p_delta where id = p_user_id;
$$;

insert into public.trivia_questions (question, options, correct_index) values
($$What is the name of Thor's hammer?$$, $$["Mjolnir","Stormbreaker","Gungnir","Excalibur"]$$::jsonb, 0),
($$What metal is Captain America's shield made of?$$, $$["Adamantium","Vibranium","Uru","Promethium"]$$::jsonb, 1),
($$What is Tony Stark's superhero name?$$, $$["War Machine","Iron Man","Star-Lord","Doctor Doom"]$$::jsonb, 1),
($$Who is the Asgardian God of Mischief?$$, $$["Thor","Odin","Loki","Heimdall"]$$::jsonb, 2),
($$What is the name of Peter Parker's aunt?$$, $$["Aunt May","Aunt Sue","Aunt Peggy","Aunt Carol"]$$::jsonb, 0),
($$What African nation does Black Panther rule?$$, $$["Sokovia","Wakanda","Latveria","Genosha"]$$::jsonb, 1),
($$Who plays Iron Man in the MCU films?$$, $$["Chris Evans","Chris Hemsworth","Robert Downey Jr.","Mark Ruffalo"]$$::jsonb, 2),
($$What is Bruce Banner's alter ego?$$, $$["Hulk","Abomination","Sandman","Rhino"]$$::jsonb, 0),
($$What organization does Nick Fury lead?$$, $$["Hydra","S.H.I.E.L.D.","A.I.M.","The Hand"]$$::jsonb, 1),
($$What was Tony Stark's AI assistant before Vision existed?$$, $$["FRIDAY","Ultron","JARVIS","EDITH"]$$::jsonb, 2),
($$Which Avenger spends decades frozen in ice?$$, $$["Iron Man","Captain America","Thor","Hawkeye"]$$::jsonb, 1),
($$Which Infinity Stone is hidden inside the Tesseract?$$, $$["Power Stone","Space Stone","Mind Stone","Time Stone"]$$::jsonb, 1),
($$Where is Doctor Strange's Sanctum in New York located?$$, $$["Kamar-Taj","The Bleeding Edge","177A Bleecker Street","Avengers Tower"]$$::jsonb, 2),
($$Who is Thor's adoptive brother?$$, $$["Balder","Loki","Heimdall","Fandral"]$$::jsonb, 1),
($$What is the name of the talking raccoon in Guardians of the Galaxy?$$, $$["Groot","Rocket","Cosmo","Howard"]$$::jsonb, 1),
($$What is Natasha Romanoff's codename?$$, $$["Black Widow","Scarlet Witch","Valkyrie","Mantis"]$$::jsonb, 0),
($$Who wields the Infinity Gauntlet in Avengers: Infinity War?$$, $$["Thanos","Loki","Ultron","Ronan"]$$::jsonb, 0),
($$What realm is Thor originally from?$$, $$["Midgard","Asgard","Sakaar","Vormir"]$$::jsonb, 1),
($$What is Peter Quill's superhero alias?$$, $$["Nova","Star-Lord","Adam Warlock","Drax"]$$::jsonb, 1),
($$What does Shuri design for her brother T'Challa?$$, $$["The Iron Legion","War Machine armor","The Panther suit","The Mark 50"]$$::jsonb, 2),
($$Who is the main villain in the first Avengers movie?$$, $$["Thanos","Loki","Ultron","Red Skull"]$$::jsonb, 1),
($$What is Scott Lang's superhero name?$$, $$["Ant-Man","Falcon","Hawkeye","Vision"]$$::jsonb, 0),
($$What android, created by Ultron, joins the Avengers?$$, $$["JARVIS","Vision","FRIDAY","Redwing"]$$::jsonb, 1),
($$Which Infinity Stone sits in Vision's forehead?$$, $$["Reality Stone","Power Stone","Mind Stone","Soul Stone"]$$::jsonb, 2),
($$What does S.H.I.E.L.D. stand for?$$, $$["Strategic Homeland Intervention Enforcement and Logistics Division","Special Heroic Intelligence Espionage League Division","Secret Hydra Infiltration and Espionage League Directorate","Strategic Hero Investigation and Enforcement Legion Department"]$$::jsonb, 0),
($$Who is Captain America's best friend turned Winter Soldier?$$, $$["Sam Wilson","Bucky Barnes","Steve Rogers","Brock Rumlow"]$$::jsonb, 1),
($$What underwater nation does Namor rule?$$, $$["Wakanda","Atlantis","Talokan","Genosha"]$$::jsonb, 2),
($$What is the name of the Guardians of the Galaxy's ship?$$, $$["The Benatar","Milano","Quinjet","Statesman"]$$::jsonb, 1),
($$Who is the Sorcerer Supreme introduced in Phase 3?$$, $$["Wong","Doctor Strange","The Ancient One","Mordo"]$$::jsonb, 1),
($$What is Captain Marvel's real name?$$, $$["Monica Rambeau","Maria Rambeau","Carol Danvers","Kamala Khan"]$$::jsonb, 2),
($$What role do the Dora Milaje serve in Wakanda?$$, $$["Royal bodyguards","Border guards","Spies","Farmers"]$$::jsonb, 0),
($$Who is Hela in Thor: Ragnarok?$$, $$["Goddess of Death","Goddess of Thunder","Queen of Asgard","Goddess of War"]$$::jsonb, 0),
($$What company does Tony Stark run?$$, $$["Oscorp","Stark Industries","Hammer Industries","Roxxon"]$$::jsonb, 1),
($$What codename does Clint Barton use in Avengers: Endgame?$$, $$["Ronin","Winter Soldier","War Machine","Nomad"]$$::jsonb, 0),
($$What alias does Steve Rogers use after Captain America: Civil War?$$, $$["Ronin","Nomad","The Falcon","Agent 13"]$$::jsonb, 1),
($$Which Infinity Stone is hidden on Vormir?$$, $$["Time Stone","Power Stone","Soul Stone","Space Stone"]$$::jsonb, 2),
($$What is the name of the Collector's home?$$, $$["Knowhere","Sakaar","Xandar","Contraxia"]$$::jsonb, 0),
($$Who is Peter Parker's main love interest across Homecoming to No Way Home?$$, $$["Gwen Stacy","MJ","Liz Allan","Betty Brant"]$$::jsonb, 1),
($$What is Groot's most famous line?$$, $$["I am Groot","Avengers Assemble","I love you 3000","We are Groot"]$$::jsonb, 0),
($$What fictional metal makes up Wolverine's claws?$$, $$["Vibranium","Adamantium","Uru","Promethium"]$$::jsonb, 1),
($$Who becomes the new Captain America after Steve Rogers retires?$$, $$["Bucky Barnes","Sam Wilson","John Walker","Sharon Carter"]$$::jsonb, 1),
($$What is Wanda Maximoff's superhero name?$$, $$["Scarlet Witch","Black Widow","Valkyrie","Mantis"]$$::jsonb, 0),
($$What does Thanos seek to collect throughout the Infinity Saga?$$, $$["Kryptonite shards","Infinity Stones","Cosmic cubes","Soul gems"]$$::jsonb, 1),
($$What realm do the Asgardian gods call home?$$, $$["Asgard","Midgard","Vanaheim","Alfheim"]$$::jsonb, 0),
($$Who directed Avengers: Endgame?$$, $$["James Gunn","Jon Favreau","Anthony and Joe Russo","Taika Waititi"]$$::jsonb, 2),
($$What subatomic realm allows time travel in Avengers: Endgame?$$, $$["The Quantum Realm","The Dark Dimension","The Microverse","The Soul World"]$$::jsonb, 0),
($$What does TVA stand for in the Loki series?$$, $$["Time Variance Authority","Temporal Variant Agency","True Variance Alliance","Time Vortex Authority"]$$::jsonb, 0),
($$What is Kamala Khan's superhero name?$$, $$["Spider-Woman","Ms. Marvel","Photon","Songbird"]$$::jsonb, 1),
($$How many Infinity Stones are there in total?$$, $$["Five","Six","Seven","Four"]$$::jsonb, 1),
($$Who plays Loki in the MCU?$$, $$["Tom Hiddleston","Chris Hemsworth","Tom Holland","Benedict Cumberbatch"]$$::jsonb, 0);
