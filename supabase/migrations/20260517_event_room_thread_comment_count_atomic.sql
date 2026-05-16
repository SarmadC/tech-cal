-- Atomic decrement of event_room_threads.comment_count for soft-delete.
-- The existing INSERT/DELETE trigger doesn't fire on UPDATE-based soft-deletes,
-- so the service previously did a read-then-write that could race under
-- concurrent deletes. This RPC evaluates `greatest(0, comment_count - 1)`
-- inside a single UPDATE so Postgres row-locking handles concurrency.

create or replace function public.event_room_thread_decrement_comment_count(
  p_thread_id uuid
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.event_room_threads
  set comment_count = greatest(0, comment_count - 1),
      updated_at = now()
  where id = p_thread_id;
$$;

grant execute on function public.event_room_thread_decrement_comment_count(uuid) to authenticated, service_role;
