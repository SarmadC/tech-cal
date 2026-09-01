-- Add SEO-friendly slug column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS slug TEXT;

-- Generate unique slugs from title + first 8 chars of UUID
-- Format: "event-title-here-a7b3c4d5"
UPDATE events
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      LEFT(title, 80), -- Limit title to 80 chars
      '[^a-zA-Z0-9\s-]', '', 'g' -- Remove special chars
    ),
    '\s+', '-', 'g' -- Replace spaces with hyphens
  )
) || '-' || SUBSTRING(id::text, 1, 8)
WHERE slug IS NULL;

-- Create unique index for URL routing and lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_slug ON events(slug);

-- Add NOT NULL constraint after populating
ALTER TABLE events ALTER COLUMN slug SET NOT NULL;;
