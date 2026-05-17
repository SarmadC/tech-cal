alter table public.event_room_thread_comments replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'event_room_thread_comments'
  ) then
    alter publication supabase_realtime
      add table public.event_room_thread_comments;
  end if;
end $$;
