create or replace function public.get_event_connection_counts_for_user(
  p_user_id uuid,
  p_event_ids uuid[]
)
returns table (event_id uuid, connection_count integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    unc.source_event_id as event_id,
    count(*)::int as connection_count
  from public.user_networking_contacts unc
  where unc.viewer_user_id = p_user_id
    and unc.source_event_id = any(p_event_ids)
    and unc.confirmed_connected_at is not null
  group by unc.source_event_id;
$$;

grant execute on function public.get_event_connection_counts_for_user(uuid, uuid[]) to authenticated;;
