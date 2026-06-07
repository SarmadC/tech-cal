alter table public.event_room_threads
  add column if not exists media jsonb not null default '[]'::jsonb;

alter table public.event_room_threads
  add constraint event_room_threads_media_is_array
  check (jsonb_typeof(media) = 'array');
