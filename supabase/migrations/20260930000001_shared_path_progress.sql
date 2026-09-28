-- The three built-in paths are just different views over the same title catalog, so watched
-- progress is now shared across them instead of tracked separately per path. Saved schedules keep
-- their own progress (keyed by schedule id), which this doesn't touch.

-- Merge existing per-path rows into a single 'titles' key, keeping the earliest watched_at.
insert into public.path_progress (user_id, path_id, title_id, watched_at)
select user_id, 'titles', title_id, min(watched_at)
from public.path_progress
where path_id in ('new-to-marvel', 'prepare-for-doomsday', 'rewatch-essentials')
group by user_id, title_id
on conflict (user_id, path_id, title_id) do update
  set watched_at = least(public.path_progress.watched_at, excluded.watched_at);

delete from public.path_progress
where path_id in ('new-to-marvel', 'prepare-for-doomsday', 'rewatch-essentials');
