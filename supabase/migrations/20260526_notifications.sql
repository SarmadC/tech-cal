-- In-app notifications surface (Phase 1: post replies, nested comment replies).
-- Phase 2 (mentions) will fire the 'mention' enum value once mention parsing
-- ships; the value is defined now to avoid a future enum alter.
--
-- Atomicity: comment + notification land in one transaction via the
-- `create_circle_comment_with_notification` RPC. Push dispatch is a separate
-- best-effort step performed after the RPC returns.

-- ---------------------------------------------------------------------------
-- Type & tables
-- ---------------------------------------------------------------------------

create type public.notification_type as enum (
  'post_reply',
  'comment_reply',
  'mention'
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id     uuid references public.profiles(id) on delete set null,
  type public.notification_type not null,

  -- Entity refs (nullable on entity delete so inbox history survives).
  post_id    uuid references public.circle_posts(id)    on delete set null,
  comment_id uuid references public.circle_comments(id) on delete set null,
  circle_id  uuid references public.circles(id)         on delete set null,

  -- Snapshot for rendering after the source entity is gone.
  actor_display_name text,
  actor_avatar_url   text,
  circle_slug        text,
  entity_preview     text,

  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_all_idx
  on public.notifications (recipient_id, created_at desc, id desc);
create index notifications_recipient_unread_idx
  on public.notifications (recipient_id, created_at desc)
  where read_at is null;

alter table public.notifications enable row level security;

create policy "users read own notifications"
  on public.notifications for select
  using (auth.uid() = recipient_id);

create policy "users update own notifications"
  on public.notifications for update
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);
-- No insert policy: the RPC is SECURITY DEFINER. Direct inserts forbidden.

create table public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  post_reply    boolean not null default true,
  comment_reply boolean not null default true,
  mention       boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

create policy "users manage own prefs"
  on public.notification_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Visibility view: single policy used by list, count, mark-read, tap-target.
-- Hides notifications whose linked post/comment is moderated-out or whose
-- actor/recipient now have a block in either direction. Rows stay in the
-- table; visibility can return if moderation is reversed.
-- ---------------------------------------------------------------------------

create view public.notifications_visible
with (security_invoker = true)
as
  select n.*
    from public.notifications n
    left join public.circle_posts    p on p.id = n.post_id
    left join public.circle_comments c on c.id = n.comment_id
    left join public.blocks b
      on (b.blocker_id = n.recipient_id and b.blocked_id = n.actor_id)
      or (b.blocker_id = n.actor_id     and b.blocked_id = n.recipient_id)
   where (n.post_id    is null or p.moderation_status = 'active')
     and (n.comment_id is null or c.moderation_status = 'active')
     and b.blocker_id is null;

grant select on public.notifications_visible to authenticated;

-- ---------------------------------------------------------------------------
-- Atomic RPC: insert comment + (conditionally) notification in one txn.
-- SECURITY DEFINER bypasses RLS so we can insert a notifications row on
-- behalf of a different user (the recipient). We validate participation,
-- moderation, parentage, and circle membership inline.
-- ---------------------------------------------------------------------------

create or replace function public.create_circle_comment_with_notification(
  payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor      uuid := auth.uid();
  v_post_id    uuid := nullif(payload->>'post_id','')::uuid;
  v_parent_id  uuid := nullif(payload->>'parent_id','')::uuid;
  v_content    text := payload->>'content';
  v_circle_id  uuid;
  v_post_mod   text;
  v_post_author uuid;
  v_parent_post uuid;
  v_parent_author uuid;
  v_comment_id uuid;
  v_recipient  uuid;
  v_type       public.notification_type;
  v_pref       boolean;
  v_blocked    boolean;
  v_notif_id   uuid;
begin
  if v_actor is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;
  if v_post_id is null or v_content is null or btrim(v_content) = '' then
    raise exception 'invalid_payload' using errcode = '22023';
  end if;

  -- Post must exist + be active.
  select circle_id, author_id, moderation_status
    into v_circle_id, v_post_author, v_post_mod
    from public.circle_posts
   where id = v_post_id;
  if v_circle_id is null then
    raise exception 'post_not_found' using errcode = 'P0002';
  end if;
  if v_post_mod is distinct from 'active' then
    raise exception 'post_not_replyable' using errcode = '42501';
  end if;

  -- Parent (if given) must belong to the same post.
  if v_parent_id is not null then
    select post_id, author_id into v_parent_post, v_parent_author
      from public.circle_comments
     where id = v_parent_id;
    if v_parent_post is null then
      raise exception 'parent_not_found' using errcode = 'P0002';
    end if;
    if v_parent_post is distinct from v_post_id then
      raise exception 'parent_post_mismatch' using errcode = '22023';
    end if;
  end if;

  -- Membership: the existing RLS policy on circle_comments requires the
  -- author to be a circle member; we replicate that here since SECURITY
  -- DEFINER bypasses RLS.
  if not exists (
    select 1 from public.circle_members
     where circle_id = v_circle_id
       and user_id = v_actor
       and membership_state in ('joined', 'following')
  ) then
    raise exception 'not_a_member' using errcode = '42501';
  end if;

  insert into public.circle_comments (post_id, parent_id, author_id, content)
       values (v_post_id, v_parent_id, v_actor, btrim(v_content))
    returning id into v_comment_id;

  -- Resolve recipient + type.
  if v_parent_id is null then
    v_recipient := v_post_author;
    v_type      := 'post_reply';
  else
    v_recipient := v_parent_author;
    v_type      := 'comment_reply';
  end if;

  -- Skip self-notifications.
  if v_recipient is not null and v_recipient <> v_actor then
    -- Block check (bidirectional).
    select exists(
      select 1 from public.blocks
       where (blocker_id = v_recipient and blocked_id = v_actor)
          or (blocker_id = v_actor     and blocked_id = v_recipient)
    ) into v_blocked;

    -- Preference check (defaults to true when no row).
    select case v_type
             when 'post_reply'    then post_reply
             when 'comment_reply' then comment_reply
             when 'mention'       then mention
           end
      into v_pref
      from public.notification_preferences
     where user_id = v_recipient;
    v_pref := coalesce(v_pref, true);

    if v_pref and not v_blocked then
      insert into public.notifications (
        recipient_id, actor_id, type, post_id, comment_id, circle_id,
        actor_display_name, actor_avatar_url, circle_slug, entity_preview
      )
      select v_recipient, v_actor, v_type, v_post_id, v_comment_id, v_circle_id,
             pr.full_name, pr.avatar_url, ci.slug, left(btrim(v_content), 140)
        from public.profiles pr
   cross join public.circles ci
       where pr.id = v_actor and ci.id = v_circle_id
      returning id into v_notif_id;
    end if;
  end if;

  return jsonb_build_object(
    'comment_id', v_comment_id,
    'notification_id', v_notif_id
  );
end
$$;

revoke all on function public.create_circle_comment_with_notification(jsonb) from public;
grant execute on function public.create_circle_comment_with_notification(jsonb) to authenticated;
