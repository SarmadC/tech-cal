-- Threads: short_code unique per event_id
alter table public.event_room_threads
  add column if not exists short_code text;

update public.event_room_threads
set short_code = substring(replace(gen_random_uuid()::text, '-', ''), 1, 6)
where short_code is null;

alter table public.event_room_threads
  alter column short_code set not null,
  alter column short_code set default substring(replace(gen_random_uuid()::text, '-', ''), 1, 6);

create unique index if not exists event_room_threads_event_short_code_uniq
  on public.event_room_threads (event_id, short_code);

-- Comments: short_code unique per thread_id
alter table public.event_room_thread_comments
  add column if not exists short_code text;

update public.event_room_thread_comments
set short_code = substring(replace(gen_random_uuid()::text, '-', ''), 1, 6)
where short_code is null;

alter table public.event_room_thread_comments
  alter column short_code set not null,
  alter column short_code set default substring(replace(gen_random_uuid()::text, '-', ''), 1, 6);

create unique index if not exists event_room_thread_comments_thread_short_code_uniq
  on public.event_room_thread_comments (thread_id, short_code);;
