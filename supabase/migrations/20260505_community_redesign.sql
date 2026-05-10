-- Community redesign: extend circles into a richer Community primitive.
-- Adds discovery metadata, two-tier membership (follow/join), event linkage,
-- structured posts, and pinning. UUID FKs throughout for referential integrity.

begin;

-- 1. Extend circles with discovery + identity metadata.
alter table public.circles
  add column if not exists tagline text,
  add column if not exists cover_image_url text,
  add column if not exists icon_url text,
  add column if not exists theme text,
  add column if not exists topic_tags text[] not null default '{}',
  add column if not exists location_scope text,
  add column if not exists visibility text not null default 'public',
  add column if not exists join_mode text not null default 'open',
  add column if not exists owner_id uuid references public.profiles(id) on delete set null,
  add column if not exists active_member_count_30d integer not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'circles_visibility_check'
  ) then
    alter table public.circles
      add constraint circles_visibility_check
      check (visibility in ('public','unlisted','private'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'circles_join_mode_check'
  ) then
    alter table public.circles
      add constraint circles_join_mode_check
      check (join_mode in ('open','request','invite'));
  end if;
end $$;

create index if not exists circles_topic_tags_idx on public.circles using gin (topic_tags);
create index if not exists circles_location_scope_idx on public.circles (location_scope);

-- 2. Two-tier membership state.
alter table public.circle_members
  add column if not exists membership_state text not null default 'joined',
  add column if not exists notification_preference text not null default 'default',
  add column if not exists last_visited_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'circle_members_state_check'
  ) then
    alter table public.circle_members
      add constraint circle_members_state_check
      check (membership_state in ('following','joined','muted'));
  end if;
end $$;

create index if not exists circle_members_state_idx
  on public.circle_members (circle_id, membership_state);

-- 3. Structured posts + optional event linkage.
alter table public.circle_posts
  add column if not exists post_type text not null default 'update',
  add column if not exists event_id uuid references public.events(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'circle_posts_type_check'
  ) then
    alter table public.circle_posts
      add constraint circle_posts_type_check
      check (post_type in ('update','question','intro','event_note','announcement'));
  end if;
end $$;

create index if not exists circle_posts_event_id_idx on public.circle_posts (event_id);

-- 4. Moderators (separate from owner_id; supports multiple per circle).
create table if not exists public.circle_moderators (
  circle_id uuid not null references public.circles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'moderator' check (role in ('owner','moderator')),
  created_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);

alter table public.circle_moderators enable row level security;

drop policy if exists circle_moderators_select on public.circle_moderators;
create policy circle_moderators_select
  on public.circle_moderators
  for select
  using (true);

drop policy if exists circle_moderators_write on public.circle_moderators;
create policy circle_moderators_write
  on public.circle_moderators
  for all
  using (
    exists (
      select 1 from public.circles c
      where c.id = circle_id and c.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.circles c
      where c.id = circle_id and c.owner_id = auth.uid()
    )
  );

-- 5. Event-to-circle linkage (many-to-many).
create table if not exists public.circle_event_links (
  circle_id uuid not null references public.circles(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (circle_id, event_id)
);

create index if not exists circle_event_links_event_id_idx
  on public.circle_event_links (event_id);

alter table public.circle_event_links enable row level security;

drop policy if exists circle_event_links_select on public.circle_event_links;
create policy circle_event_links_select
  on public.circle_event_links
  for select
  using (true);

drop policy if exists circle_event_links_write on public.circle_event_links;
create policy circle_event_links_write
  on public.circle_event_links
  for all
  using (
    exists (
      select 1 from public.circles c
      where c.id = circle_id and (
        c.owner_id = auth.uid()
        or exists (
          select 1 from public.circle_moderators m
          where m.circle_id = c.id and m.user_id = auth.uid()
        )
      )
    )
  )
  with check (
    exists (
      select 1 from public.circles c
      where c.id = circle_id and (
        c.owner_id = auth.uid()
        or exists (
          select 1 from public.circle_moderators m
          where m.circle_id = c.id and m.user_id = auth.uid()
        )
      )
    )
  );

-- 6. Pinned post per circle (at most one in v1).
create table if not exists public.circle_post_pins (
  circle_id uuid primary key references public.circles(id) on delete cascade,
  post_id uuid not null references public.circle_posts(id) on delete cascade,
  pinned_by uuid references public.profiles(id) on delete set null,
  pinned_at timestamptz not null default now()
);

alter table public.circle_post_pins enable row level security;

drop policy if exists circle_post_pins_select on public.circle_post_pins;
create policy circle_post_pins_select
  on public.circle_post_pins
  for select
  using (true);

drop policy if exists circle_post_pins_write on public.circle_post_pins;
create policy circle_post_pins_write
  on public.circle_post_pins
  for all
  using (
    exists (
      select 1 from public.circles c
      where c.id = circle_id and (
        c.owner_id = auth.uid()
        or exists (
          select 1 from public.circle_moderators m
          where m.circle_id = c.id and m.user_id = auth.uid()
        )
      )
    )
  )
  with check (
    exists (
      select 1 from public.circles c
      where c.id = circle_id and (
        c.owner_id = auth.uid()
        or exists (
          select 1 from public.circle_moderators m
          where m.circle_id = c.id and m.user_id = auth.uid()
        )
      )
    )
  );

commit;
