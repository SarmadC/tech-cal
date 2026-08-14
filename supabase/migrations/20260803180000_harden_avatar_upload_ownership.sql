-- Keep avatar object names user-scoped. Both the legacy web uploader and the
-- mobile uploader write avatars/{userId}-{unique-suffix}.{ext}.
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;

CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (
    name LIKE 'avatars/' || (SELECT auth.uid())::text || '-%'
    OR name LIKE (SELECT auth.uid())::text || '-%'
  )
);
