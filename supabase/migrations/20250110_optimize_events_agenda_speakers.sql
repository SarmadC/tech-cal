-- Events-Agenda-Speakers Optimization Migration
-- Adds indexes, constraints, triggers, and views to normalize the schema

-- 1. Add reverse-lookup index for speaker queries
create index if not exists idx_agenda_speakers_speaker
  on public.agenda_speakers (speaker_id);
-- 2. Add simple index on event_id for view performance (composite indexes exist but this helps views)
create index if not exists idx_event_agenda_event_id
  on public.event_agenda (event_id);
-- 3. Enforce order uniqueness per day (safe: no duplicates currently)
-- 3. Enforce order uniqueness per day (safe: no duplicates currently)
DO $$ BEGIN
  ALTER TABLE public.event_agenda
    ADD CONSTRAINT event_agenda_unique_sort_per_day
    UNIQUE (event_id, day_number, sort_order);
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN duplicate_table THEN null; -- Postgres sometimes reports constraint violation as duplicate table
END $$;
-- 4. Trigger function to sync event_id and event_title from agenda_id
-- Optimized: single query with JOIN instead of two separate SELECTs
create or replace function public.agenda_speakers_sync()
returns trigger as $$
begin
  -- Always derive the authoritative event_id and event_title from the referenced agenda row
  -- Using STRICT is safe because FK constraint ensures agenda_id exists
  select
    ea.event_id,
    e.title
  into strict
    new.event_id,
    new.event_title
  from public.event_agenda ea
  join public.events e on e.id = ea.event_id
  where ea.id = new.agenda_id;

  return new;
end;
$$ language plpgsql;
-- Ensure it runs for inserts and when agenda_id changes
drop trigger if exists trg_agenda_speakers_sync on public.agenda_speakers;
create trigger trg_agenda_speakers_sync
before insert or update of agenda_id on public.agenda_speakers
for each row execute function public.agenda_speakers_sync();
-- 5. Propagate title changes from events → agenda_speakers.event_title
create or replace function public.events_title_propagate()
returns trigger as $$
begin
  update public.agenda_speakers set event_title = new.title
  where event_id = new.id;
  return null;
end;
$$ language plpgsql;
drop trigger if exists trg_events_title_propagate on public.events;
create trigger trg_events_title_propagate
after update of title on public.events
for each row execute function public.events_title_propagate();
-- 6. Event-level speakers view (normalized source of truth)
-- Flat join view
create or replace view public.event_speakers_flat as
select distinct
  ea.event_id,
  s.id   as speaker_id,
  s.name as speaker_name
from public.event_agenda ea
join public.agenda_speakers asg on asg.agenda_id = ea.id
join public.speakers s on s.id = asg.speaker_id;
-- Aggregated list view (handy for UI)
create or replace view public.event_speaker_list as
select es.event_id,
       array_agg(distinct es.speaker_name order by es.speaker_name) as speakers
from public.event_speakers_flat es
group by es.event_id;
-- Comments for documentation
comment on index idx_agenda_speakers_speaker is 'Reverse lookup index for finding all agenda items by speaker';
comment on index idx_event_agenda_event_id is 'Simple index on event_id for view performance and common queries';
comment on constraint event_agenda_unique_sort_per_day on public.event_agenda is 'Ensures unique sort order per event day';
comment on function public.agenda_speakers_sync() is 'Syncs event_id and event_title from agenda_id on insert/update (optimized with single JOIN)';
comment on function public.events_title_propagate() is 'Propagates event title changes to agenda_speakers.event_title';
comment on view public.event_speakers_flat is 'Flat list of all event-speaker relationships derived from agenda items';
comment on view public.event_speaker_list is 'Aggregated speaker names per event, derived from agenda items';
