-- Event room threads: lightweight discussion seeded around an event.
-- A thread belongs to an event and an author; comments belong to a thread.

create table if not exists public.event_room_threads (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  body text not null check (char_length(body) <= 5000),
  comment_count integer not null default 0,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_room_threads_event_recent_idx
  on public.event_room_threads (event_id, last_activity_at desc);

create index if not exists event_room_threads_author_idx
  on public.event_room_threads (author_id);

create table if not exists public.event_room_thread_comments (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.event_room_threads(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists event_room_thread_comments_thread_idx
  on public.event_room_thread_comments (thread_id, created_at desc);

create index if not exists event_room_thread_comments_author_idx
  on public.event_room_thread_comments (author_id);

-- Bump thread.comment_count + last_activity_at when a comment is added.
create or replace function public.bump_event_room_thread_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.event_room_threads
    set comment_count = comment_count + 1,
        last_activity_at = greatest(last_activity_at, new.created_at),
        updated_at = now()
    where id = new.thread_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.event_room_threads
    set comment_count = greatest(comment_count - 1, 0),
        updated_at = now()
    where id = old.thread_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_event_room_thread_comments_activity
  on public.event_room_thread_comments;

create trigger trg_event_room_thread_comments_activity
  after insert or delete on public.event_room_thread_comments
  for each row execute function public.bump_event_room_thread_activity();

-- Row level security
alter table public.event_room_threads enable row level security;

drop policy if exists event_room_threads_select on public.event_room_threads;
create policy event_room_threads_select
  on public.event_room_threads
  for select
  using (auth.uid() is not null);

drop policy if exists event_room_threads_insert on public.event_room_threads;
create policy event_room_threads_insert
  on public.event_room_threads
  for insert
  with check (author_id = auth.uid());

drop policy if exists event_room_threads_update on public.event_room_threads;
create policy event_room_threads_update
  on public.event_room_threads
  for update
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

drop policy if exists event_room_threads_delete on public.event_room_threads;
create policy event_room_threads_delete
  on public.event_room_threads
  for delete
  using (author_id = auth.uid());

alter table public.event_room_thread_comments enable row level security;

drop policy if exists event_room_thread_comments_select
  on public.event_room_thread_comments;
create policy event_room_thread_comments_select
  on public.event_room_thread_comments
  for select
  using (auth.uid() is not null);

drop policy if exists event_room_thread_comments_insert
  on public.event_room_thread_comments;
create policy event_room_thread_comments_insert
  on public.event_room_thread_comments
  for insert
  with check (author_id = auth.uid());

drop policy if exists event_room_thread_comments_update
  on public.event_room_thread_comments;
create policy event_room_thread_comments_update
  on public.event_room_thread_comments
  for update
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

drop policy if exists event_room_thread_comments_delete
  on public.event_room_thread_comments;
create policy event_room_thread_comments_delete
  on public.event_room_thread_comments
  for delete
  using (author_id = auth.uid());
