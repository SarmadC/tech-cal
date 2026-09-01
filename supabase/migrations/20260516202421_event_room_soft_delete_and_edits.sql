alter table public.event_room_threads
  add column if not exists deleted_at timestamptz null,
  add column if not exists edited_at  timestamptz null;

alter table public.event_room_thread_comments
  add column if not exists deleted_at timestamptz null,
  add column if not exists edited_at  timestamptz null;

create index if not exists event_room_threads_active_recent_idx
  on public.event_room_threads (event_id, last_activity_at desc)
  where deleted_at is null;;
