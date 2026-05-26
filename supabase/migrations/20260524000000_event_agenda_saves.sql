-- Session-level saves for event agenda items.
-- Raw rows are user-owned; event detail surfaces only aggregate counts via RPC.

create table if not exists public.user_event_agenda_saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  agenda_item_id uuid not null references public.event_agenda(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, agenda_item_id)
);

create index if not exists user_event_agenda_saves_event_idx
  on public.user_event_agenda_saves (event_id, agenda_item_id);

create index if not exists user_event_agenda_saves_user_event_idx
  on public.user_event_agenda_saves (user_id, event_id);

alter table public.user_event_agenda_saves enable row level security;

drop policy if exists "Users can read own agenda saves" on public.user_event_agenda_saves;
create policy "Users can read own agenda saves"
  on public.user_event_agenda_saves
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create own agenda saves" on public.user_event_agenda_saves;
create policy "Users can create own agenda saves"
  on public.user_event_agenda_saves
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.event_agenda ea
      where ea.id = agenda_item_id
        and ea.event_id = user_event_agenda_saves.event_id
    )
  );

drop policy if exists "Users can delete own agenda saves" on public.user_event_agenda_saves;
create policy "Users can delete own agenda saves"
  on public.user_event_agenda_saves
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, delete on public.user_event_agenda_saves to authenticated;
grant select on public.user_event_agenda_saves to service_role;
