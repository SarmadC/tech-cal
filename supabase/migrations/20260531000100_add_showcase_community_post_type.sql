begin;

alter table public.circle_posts
  drop constraint if exists circle_posts_type_check;

alter table public.circle_posts
  add constraint circle_posts_type_check
  check (post_type in (
    'update',
    'question',
    'intro',
    'showcase',
    'event_note',
    'announcement'
  ));

commit;
