-- Create the 'avatars' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects if not already enabled (usually is, but good practice)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 1. Allow public access to view avatars
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- 2. Allow authenticated users to upload their own avatar
-- Enforce that the file path must contain the user's ID to prevent path spoofing
-- Path format: avatars/{userId}-{timestamp}.{ext}
-- This prevents users from uploading files with paths that don't belong to them
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (
    -- Match pattern: avatars/{userId}-{anything}
    name LIKE 'avatars/' || auth.uid()::text || '-%'
    -- Or match pattern: {userId}-{anything} (if path doesn't include avatars/ prefix)
    OR name LIKE auth.uid()::text || '-%'
  )
);

-- 3. Allow users to update their own avatars (based on owner column setup)
CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid() = owner
);

-- 4. Allow users to delete their own avatars
CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid() = owner
);
