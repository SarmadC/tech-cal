begin;

create table if not exists public.circle_post_mentions (
  post_id uuid not null references public.circle_posts(id) on delete cascade,
  mentioned_profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, mentioned_profile_id)
);

create index if not exists circle_post_mentions_profile_idx
  on public.circle_post_mentions (mentioned_profile_id);

create table if not exists public.circle_post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.circle_posts(id) on delete cascade,
  storage_path text not null,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  unique (post_id, position)
);

create index if not exists circle_post_media_post_position_idx
  on public.circle_post_media (post_id, position);

create table if not exists public.circle_post_links (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.circle_posts(id) on delete cascade,
  url text not null,
  title text,
  description text,
  image_url text,
  site_name text,
  created_at timestamptz not null default now()
);

create index if not exists circle_post_links_post_idx
  on public.circle_post_links (post_id, created_at);

alter table public.circle_post_mentions enable row level security;
alter table public.circle_post_media enable row level security;
alter table public.circle_post_links enable row level security;

revoke all on public.circle_post_mentions from anon, authenticated;
revoke all on public.circle_post_media from anon, authenticated;
revoke all on public.circle_post_links from anon, authenticated;

grant select on public.circle_post_mentions to anon;
grant select on public.circle_post_media to anon;
grant select on public.circle_post_links to anon;

grant select, insert, delete on public.circle_post_mentions to authenticated;
grant select, insert, delete on public.circle_post_media to authenticated;
grant select, insert, update, delete on public.circle_post_links to authenticated;

drop policy if exists circle_post_mentions_select on public.circle_post_mentions;
create policy circle_post_mentions_select
  on public.circle_post_mentions
  for select
  using (
    exists (
      select 1
      from public.circle_posts p
      join public.circles c on c.id = p.circle_id
      left join public.circle_members m
        on m.circle_id = c.id and m.user_id = auth.uid()
      where p.id = post_id
        and (
          c.visibility in ('public', 'unlisted')
          or m.user_id is not null
          or c.owner_id = auth.uid()
        )
    )
  );

drop policy if exists circle_post_mentions_insert on public.circle_post_mentions;
create policy circle_post_mentions_insert
  on public.circle_post_mentions
  for insert
  with check (
    exists (
      select 1
      from public.circle_posts p
      where p.id = post_id and p.author_id = auth.uid()
    )
  );

drop policy if exists circle_post_mentions_delete on public.circle_post_mentions;
create policy circle_post_mentions_delete
  on public.circle_post_mentions
  for delete
  using (
    exists (
      select 1
      from public.circle_posts p
      where p.id = post_id and p.author_id = auth.uid()
    )
  );

drop policy if exists circle_post_media_select on public.circle_post_media;
create policy circle_post_media_select
  on public.circle_post_media
  for select
  using (
    exists (
      select 1
      from public.circle_posts p
      join public.circles c on c.id = p.circle_id
      left join public.circle_members m
        on m.circle_id = c.id and m.user_id = auth.uid()
      where p.id = post_id
        and (
          c.visibility in ('public', 'unlisted')
          or m.user_id is not null
          or c.owner_id = auth.uid()
        )
    )
  );

drop policy if exists circle_post_media_insert on public.circle_post_media;
create policy circle_post_media_insert
  on public.circle_post_media
  for insert
  with check (
    exists (
      select 1
      from public.circle_posts p
      where p.id = post_id and p.author_id = auth.uid()
    )
  );

drop policy if exists circle_post_media_delete on public.circle_post_media;
create policy circle_post_media_delete
  on public.circle_post_media
  for delete
  using (
    exists (
      select 1
      from public.circle_posts p
      where p.id = post_id and p.author_id = auth.uid()
    )
  );

drop policy if exists circle_post_links_select on public.circle_post_links;
create policy circle_post_links_select
  on public.circle_post_links
  for select
  using (
    exists (
      select 1
      from public.circle_posts p
      join public.circles c on c.id = p.circle_id
      left join public.circle_members m
        on m.circle_id = c.id and m.user_id = auth.uid()
      where p.id = post_id
        and (
          c.visibility in ('public', 'unlisted')
          or m.user_id is not null
          or c.owner_id = auth.uid()
        )
    )
  );

drop policy if exists circle_post_links_author_write on public.circle_post_links;
create policy circle_post_links_author_write
  on public.circle_post_links
  for all
  using (
    exists (
      select 1
      from public.circle_posts p
      where p.id = post_id and p.author_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.circle_posts p
      where p.id = post_id and p.author_id = auth.uid()
    )
  );

create or replace function public.create_circle_post_with_rich_content(
  p_circle_id uuid,
  p_content text,
  p_post_type text default null,
  p_event_id uuid default null,
  p_mentions uuid[] default '{}',
  p_media jsonb default '[]'::jsonb
)
returns table (id uuid)
language plpgsql
set search_path = public
as $$
declare
  v_post_id uuid;
  v_media_count integer;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  v_media_count := coalesce(jsonb_array_length(p_media), 0);

  if length(btrim(coalesce(p_content, ''))) = 0
    and p_event_id is null
    and v_media_count = 0 then
    raise exception 'post_content_required' using errcode = '23514';
  end if;

  if v_media_count > 4 then
    raise exception 'too_many_media_items' using errcode = '23514';
  end if;

  if p_event_id is not null and not exists (
    select 1
    from public.circle_event_links l
    where l.circle_id = p_circle_id
      and l.event_id = p_event_id
  ) then
    raise exception 'event_not_linked_to_circle' using errcode = '23514';
  end if;

  insert into public.circle_posts (
    circle_id,
    author_id,
    content,
    post_type,
    event_id
  )
  values (
    p_circle_id,
    auth.uid(),
    btrim(coalesce(p_content, '')),
    coalesce(p_post_type, 'update'),
    p_event_id
  )
  returning circle_posts.id into v_post_id;

  insert into public.circle_post_mentions (post_id, mentioned_profile_id)
  select v_post_id, mention_id
  from (
    select distinct unnest(coalesce(p_mentions, '{}')) as mention_id
  ) mentions
  where mention_id is not null;

  insert into public.circle_post_media (
    post_id,
    storage_path,
    width,
    height,
    position
  )
  select
    v_post_id,
    item.value ->> 'storage_path',
    (item.value ->> 'width')::integer,
    (item.value ->> 'height')::integer,
    item.position - 1
  from jsonb_array_elements(coalesce(p_media, '[]'::jsonb))
    with ordinality as item(value, position);

  return query select v_post_id;
end;
$$;

grant execute on function public.create_circle_post_with_rich_content(
  uuid,
  text,
  text,
  uuid,
  uuid[],
  jsonb
) to authenticated;

commit;
