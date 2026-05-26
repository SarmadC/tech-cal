-- Remove stale journey activity after an attendance status has been cleared.
-- Keep bookmarks represented as saved activity and leave speaking roles intact.
update public.user_events
set activity_type = case
  when is_bookmarked = true then 'saved'::user_event_activity_type
  else null
end
where status is null
  and activity_type in ('attending', 'attended');
