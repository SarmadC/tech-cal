-- Soft-delete + edit-tracking for event room threads and comments.
-- Soft delete keeps row structure intact so child replies under a
-- "deleted" parent still render. The service masks the body and author
-- on read.

alter table public.event_room_threads
  add column if not exists deleted_at timestamptz null,
  add column if not exists edited_at  timestamptz null;

alter table public.event_room_thread_comments
  add column if not exists deleted_at timestamptz null,
  add column if not exists edited_at  timestamptz null;

-- Skip soft-deleted threads in list/index queries.
create index if not exists event_room_threads_active_recent_idx
  on public.event_room_threads (event_id, last_activity_at desc)
  where deleted_at is null;
