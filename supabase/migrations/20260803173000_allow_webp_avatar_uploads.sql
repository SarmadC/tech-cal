-- Mobile avatars are normalized to WebP before they reach Storage. Preserve
-- JPEG and PNG for the existing profile upload paths while allowing the
-- canonical mobile output format.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/png',
  'image/webp'
]::text[]
WHERE id = 'avatars';
