-- Event activity model: enrich user_events with an explicit activity_type
-- and role, plus an RPC for mutual attendees per event.
--
-- activity_type categorizes a user's relationship to an event for the
-- public profile feed:
--   'attending' — future event the user has RSVP'd to
--   'attended'  — past event the user RSVP'd to
--   'saved'     — bookmarked but no RSVP
--   'speaking'  — user has a speaking role at the event
--
-- We keep status + is_bookmarked alongside for backwards compatibility;
-- activity_type is derived from them today, may diverge in future.

create type user_event_activity_type as enum (
  'attending',
  'attended',
  'saved',
  'speaking'
);

alter table public.user_events
  add column activity_type user_event_activity_type,
  add column role text;

-- Backfill from existing status + bookmark + event timing.
update public.user_events ue
set activity_type = case
  when ue.status = 'attending' and e.start_time > now() then 'attending'::user_event_activity_type
  when ue.status = 'attending' and e.start_time <= now() then 'attended'::user_event_activity_type
  when ue.is_bookmarked = true then 'saved'::user_event_activity_type
  else null
end
from public.events e
where e.id = ue.event_id;

create index if not exists user_events_user_activity_start_idx
  on public.user_events (user_id, activity_type);

-- Mutual attendees per event (for the viewing user vs profile user).
-- Returns one row per requested event with the count of profiles that
-- both the viewer and the target are connected to AND who are attending
-- that event. We approximate "mutual" as the intersection of follows
-- (matches the existing mutual-connections semantics in publicProfileService).
create or replace function public.get_mutual_attendees_for_events(
  p_viewer_id uuid,
  p_target_id uuid,
  p_event_ids uuid[]
)
returns table (event_id uuid, mutual_count integer)
language sql
stable
security definer
set search_path = public
as $$
  with viewer_follows as (
    select following_id from public.follows where follower_id = p_viewer_id
  ),
  target_follows as (
    select following_id from public.follows where follower_id = p_target_id
  ),
  mutual_users as (
    select following_id as user_id from viewer_follows
    intersect
    select following_id from target_follows
  )
  select
    ue.event_id,
    count(distinct ue.user_id)::int as mutual_count
  from public.user_events ue
  join mutual_users mu on mu.user_id = ue.user_id
  where ue.event_id = any(p_event_ids)
    and ue.activity_type in ('attending', 'attended', 'speaking')
  group by ue.event_id;
$$;

grant execute on function public.get_mutual_attendees_for_events(uuid, uuid, uuid[]) to authenticated;
