-- One-time "new feature" popup for Allbum, same pattern as ratings_notice_seen /
-- tic_tac_toe_notice_seen / draft_notice_seen.

alter table public.users add column album_notice_seen boolean not null default false;
