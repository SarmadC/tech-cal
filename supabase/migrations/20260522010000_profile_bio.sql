-- Optional free-form bio on the public profile. Surfaced on the
-- mobile/web profile screens under the headline; lets users add
-- personality and conversation hooks beyond their role + topics.
alter table public.profiles add column if not exists bio text;
