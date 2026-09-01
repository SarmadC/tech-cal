-- Update bucket configuration to include standard icon MIME types
UPDATE storage.buckets
SET allowed_mime_types = array_cat(allowed_mime_types, ARRAY['image/x-icon', 'image/vnd.microsoft.icon'])
WHERE id = 'logos';

-- Add RLS policies for the logos bucket
-- 1. Authenticated users can upload logos
CREATE POLICY "Authenticated users can upload logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'logos');

-- 2. Users can update their own logos
CREATE POLICY "Users can update their own logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'logos' AND (auth.uid() = owner))
WITH CHECK (bucket_id = 'logos' AND (auth.uid() = owner));

-- 3. Users can delete their own logos
CREATE POLICY "Users can delete their own logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'logos' AND (auth.uid() = owner));
;
