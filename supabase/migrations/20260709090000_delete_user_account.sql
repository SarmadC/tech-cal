begin;

create or replace function public.delete_user_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  dependency record;
begin
  if p_user_id is null then
    raise exception 'user_id_required' using errcode = '22023';
  end if;

  -- Older tables predate the current cascade conventions. Resolve any
  -- single-column NO ACTION/RESTRICT references in the public schema before
  -- deleting the profile: nullable audit references are anonymized and
  -- non-null user-owned records are removed.
  for dependency in
    select
      source_namespace.nspname as schema_name,
      source_table.relname as table_name,
      source_column.attname as column_name,
      source_column.attnotnull as is_required,
      constraint_row.confdeltype as delete_action
    from pg_constraint constraint_row
    join pg_class source_table on source_table.oid = constraint_row.conrelid
    join pg_namespace source_namespace on source_namespace.oid = source_table.relnamespace
    join pg_class target_table on target_table.oid = constraint_row.confrelid
    join pg_namespace target_namespace on target_namespace.oid = target_table.relnamespace
    join pg_attribute source_column
      on source_column.attrelid = source_table.oid
      and source_column.attnum = constraint_row.conkey[1]
    where constraint_row.contype = 'f'
      and source_namespace.nspname = 'public'
      and cardinality(constraint_row.conkey) = 1
      and constraint_row.confdeltype in ('a', 'r')
      and (
        (target_namespace.nspname = 'public' and target_table.relname = 'profiles')
        or (target_namespace.nspname = 'auth' and target_table.relname = 'users')
      )
  loop
    if dependency.is_required then
      execute format(
        'delete from %I.%I where %I = $1',
        dependency.schema_name,
        dependency.table_name,
        dependency.column_name
      ) using p_user_id;
    else
      execute format(
        'update %I.%I set %I = null where %I = $1',
        dependency.schema_name,
        dependency.table_name,
        dependency.column_name,
        dependency.column_name
      ) using p_user_id;
    end if;
  end loop;

  delete from public.profiles where id = p_user_id;
  delete from auth.users where id = p_user_id;

  if not found then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.delete_user_account(uuid) from public, anon, authenticated;
grant execute on function public.delete_user_account(uuid) to service_role;

commit;
