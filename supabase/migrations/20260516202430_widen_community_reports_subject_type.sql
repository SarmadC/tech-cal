alter table public.community_reports
  drop constraint if exists community_reports_subject_type_check;

alter table public.community_reports
  add constraint community_reports_subject_type_check
  check (subject_type = ANY (ARRAY[
    'post'::text,
    'comment'::text,
    'profile'::text,
    'event_thread'::text,
    'event_thread_comment'::text
  ]));;
