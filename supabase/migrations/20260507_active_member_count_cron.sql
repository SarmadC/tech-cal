-- Nightly refresh of circles.active_member_count_30d.
-- A "active member" is anyone whose last_visited_at falls inside the trailing
-- 30 days. Counts run in a single set-based update — no per-row loop —
-- so this stays cheap even at 10k+ circles.

begin;

-- 1. pg_cron lives in its own schema; safe to enable repeatedly.
create extension if not exists pg_cron with schema extensions;

-- 2. The refresh function. Marked SECURITY DEFINER so the cron owner
-- (postgres) can write to circles regardless of who scheduled the job;
-- the function only touches the count column, so it cannot be misused
-- to bypass other RLS.
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

  -- Zero out circles that lost all activity in the window.
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

-- 3. Schedule: every day at 03:15 UTC. Replace job if it already exists.
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

-- 4. Backfill once so the column has real values immediately rather than
-- waiting for the first 03:15 UTC firing.
select public.refresh_circle_active_member_count();

commit;
