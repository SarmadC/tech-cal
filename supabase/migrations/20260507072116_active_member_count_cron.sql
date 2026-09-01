create extension if not exists pg_cron with schema extensions;

create or replace function public.refresh_circle_active_member_count()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.circles c
  set active_member_count_30d = sub.cnt
  from (
    select circle_id, count(*)::int as cnt
    from public.circle_members
    where last_visited_at is not null
      and last_visited_at >= now() - interval '30 days'
    group by circle_id
  ) sub
  where c.id = sub.circle_id
    and c.active_member_count_30d is distinct from sub.cnt;

  update public.circles c
  set active_member_count_30d = 0
  where c.active_member_count_30d <> 0
    and not exists (
      select 1 from public.circle_members m
      where m.circle_id = c.id
        and m.last_visited_at >= now() - interval '30 days'
    );
end;
$$;

revoke all on function public.refresh_circle_active_member_count() from public;
grant execute on function public.refresh_circle_active_member_count() to postgres;

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'refresh_circle_active_member_count';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'refresh_circle_active_member_count',
    '15 3 * * *',
    $cron$select public.refresh_circle_active_member_count();$cron$
  );
end $$;

select public.refresh_circle_active_member_count();;
