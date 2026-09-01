alter table public.event_room_thread_comments
  add column if not exists parent_comment_id uuid
  references public.event_room_thread_comments(id) on delete cascade;

create index if not exists event_room_thread_comments_parent_idx
  on public.event_room_thread_comments (parent_comment_id);;
