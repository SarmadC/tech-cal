-- Reversible notification dismissal for the mobile inbox.

alter table public.notifications
  add column if not exists dismissed_at timestamptz;

create index if not exists notifications_recipient_visible_idx
  on public.notifications (recipient_id, created_at desc, id desc)
  where dismissed_at is null;

create or replace view public.notifications_visible
with (security_invoker = true)
as
  select n.*
    from public.notifications n
    left join public.circle_posts    p on p.id = n.post_id
    left join public.circle_comments c on c.id = n.comment_id
    left join public.blocks b
      on (b.blocker_id = n.recipient_id and b.blocked_id = n.actor_id)
      or (b.blocker_id = n.actor_id     and b.blocked_id = n.recipient_id)
   where n.dismissed_at is null
     and (n.post_id    is null or p.moderation_status = 'active')
     and (n.comment_id is null or c.moderation_status = 'active')
     and b.blocker_id is null;

grant select on public.notifications_visible to authenticated;
