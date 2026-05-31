begin;

revoke all on public.circle_post_mentions from anon, authenticated;
revoke all on public.circle_post_media from anon, authenticated;
revoke all on public.circle_post_links from anon, authenticated;

grant select on public.circle_post_mentions to anon;
grant select on public.circle_post_media to anon;
grant select on public.circle_post_links to anon;

grant select, insert, delete on public.circle_post_mentions to authenticated;
grant select, insert, delete on public.circle_post_media to authenticated;
grant select, insert, update, delete on public.circle_post_links to authenticated;

commit;
