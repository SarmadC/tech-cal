begin;

drop policy if exists circle_post_mentions_select on public.circle_post_mentions;
create policy circle_post_mentions_select
  on public.circle_post_mentions
  for select
  using (
    exists (
      select 1
      from public.circle_posts p
      where p.id = circle_post_mentions.post_id
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
      where p.id = circle_post_media.post_id
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
      where p.id = circle_post_links.post_id
    )
  );

commit;
