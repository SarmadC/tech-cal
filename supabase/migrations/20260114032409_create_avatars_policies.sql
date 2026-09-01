
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.uid() = owner
);

CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.uid() = owner
);
;
