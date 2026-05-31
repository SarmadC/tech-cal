begin;

drop function if exists public.create_circle_post_with_rich_content(
  uuid,
  text,
  text,
  uuid,
  uuid[],
  jsonb
);

create function public.create_circle_post_with_rich_content(
  p_circle_id uuid,
  p_content text,
  p_post_type text default null,
  p_event_id uuid default null,
  p_mentions uuid[] default '{}',
  p_media jsonb default '[]'::jsonb
)
returns table (id uuid, notification_ids uuid[])
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_post_id uuid;
  v_media_count integer;
  v_notification_id uuid;
  v_notification_ids uuid[] := '{}';
begin
  if v_actor is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = v_actor
      and p.community_moderation_status = 'active'
  ) then
    raise exception 'community_access_restricted' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.circle_members m
    where m.circle_id = p_circle_id
      and m.user_id = v_actor
      and m.membership_state = 'joined'
  ) then
    raise exception 'not_a_member' using errcode = '42501';
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
    v_actor,
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

  for v_notification_id in
    insert into public.notifications (
      recipient_id,
      actor_id,
      type,
      post_id,
      circle_id,
      actor_display_name,
      actor_avatar_url,
      circle_slug,
      entity_preview
    )
    select
      mentioned.mentioned_profile_id,
      v_actor,
      'mention'::public.notification_type,
      v_post_id,
      p_circle_id,
      actor.full_name,
      actor.avatar_url,
      circle.slug,
      left(btrim(coalesce(p_content, '')), 140)
    from (
      select distinct unnest(coalesce(p_mentions, '{}')) as mentioned_profile_id
    ) mentioned
    join public.profiles mentioned_profile
      on mentioned_profile.id = mentioned.mentioned_profile_id
    join public.profiles actor
      on actor.id = v_actor
    join public.circles circle
      on circle.id = p_circle_id
    left join public.notification_preferences pref
      on pref.user_id = mentioned.mentioned_profile_id
    where mentioned.mentioned_profile_id <> v_actor
      and coalesce(pref.mention, true)
      and not exists (
        select 1
        from public.blocks b
        where (b.blocker_id = mentioned.mentioned_profile_id and b.blocked_id = v_actor)
           or (b.blocker_id = v_actor and b.blocked_id = mentioned.mentioned_profile_id)
      )
    returning notifications.id
  loop
    v_notification_ids := array_append(v_notification_ids, v_notification_id);
  end loop;

  return query select v_post_id, v_notification_ids;
end;
$$;

revoke all on function public.create_circle_post_with_rich_content(
  uuid,
  text,
  text,
  uuid,
  uuid[],
  jsonb
) from public;

grant execute on function public.create_circle_post_with_rich_content(
  uuid,
  text,
  text,
  uuid,
  uuid[],
  jsonb
) to authenticated;

commit;
