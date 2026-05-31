begin;

-- The community-media bucket is created public (reads served via the public CDN),
-- but storage.objects has RLS enabled with no policies for this bucket, so
-- authenticated uploads/deletes were denied. Scope writes to the uploader's own
-- folder ("{userId}/...") to match mobileApi.uploadCommunityPostImage and the
-- create_circle_post_with_rich_content media ownership check.

drop policy if exists "Authenticated users can upload community media" on storage.objects;
create policy "Authenticated users can upload community media"
  on storage.objects
  for insert
  with check (
    bucket_id = 'community-media'
    and auth.role() = 'authenticated'
    and name like auth.uid()::text || '/%'
  );

drop policy if exists "Users can delete their own community media" on storage.objects;
create policy "Users can delete their own community media"
  on storage.objects
  for delete
  using (
    bucket_id = 'community-media'
    and auth.uid() = owner
  );

commit;
