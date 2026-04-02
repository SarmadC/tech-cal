ALTER TABLE IF EXISTS public.user_submitted_events
ADD COLUMN IF NOT EXISTS timezone text,
ADD COLUMN IF NOT EXISTS event_format text,
ADD COLUMN IF NOT EXISTS event_pattern text,
ADD COLUMN IF NOT EXISTS is_multi_day boolean,
ADD COLUMN IF NOT EXISTS location_city text,
ADD COLUMN IF NOT EXISTS location_state text,
ADD COLUMN IF NOT EXISTS location_country text,
ADD COLUMN IF NOT EXISTS livestream_url text,
ADD COLUMN IF NOT EXISTS event_image_url text,
ADD COLUMN IF NOT EXISTS agenda_url text,
ADD COLUMN IF NOT EXISTS pricing_type text,
ADD COLUMN IF NOT EXISTS price_min numeric,
ADD COLUMN IF NOT EXISTS price_max numeric,
ADD COLUMN IF NOT EXISTS currency text,
ADD COLUMN IF NOT EXISTS registration_deadline timestamptz,
ADD COLUMN IF NOT EXISTS difficulty_level text,
ADD COLUMN IF NOT EXISTS language text,
ADD COLUMN IF NOT EXISTS capacity integer,
ADD COLUMN IF NOT EXISTS attendee_count integer,
ADD COLUMN IF NOT EXISTS certificate_offered boolean,
ADD COLUMN IF NOT EXISTS recording_available boolean,
ADD COLUMN IF NOT EXISTS social_media_hashtag text,
ADD COLUMN IF NOT EXISTS virtual_platform text,
ADD COLUMN IF NOT EXISTS target_audience text,
ADD COLUMN IF NOT EXISTS prerequisites text,
ADD COLUMN IF NOT EXISTS accessibility_features jsonb,
ADD COLUMN IF NOT EXISTS speaker_lineup jsonb,
ADD COLUMN IF NOT EXISTS organizer_details jsonb,
ADD COLUMN IF NOT EXISTS series_details jsonb;

UPDATE public.user_submitted_events
SET event_format = CASE
    WHEN is_virtual = true THEN 'Online'
    WHEN COALESCE(NULLIF(BTRIM(location), ''), NULL) IS NULL THEN 'Online'
    ELSE 'In-person'
END
WHERE event_format IS NULL;

ALTER TABLE IF EXISTS public.user_submitted_events
DROP CONSTRAINT IF EXISTS user_submitted_events_event_format_check;

ALTER TABLE IF EXISTS public.user_submitted_events
ADD CONSTRAINT user_submitted_events_event_format_check
CHECK (event_format IS NULL OR event_format IN ('Online', 'In-person', 'Hybrid'));

ALTER TABLE IF EXISTS public.user_submitted_events
DROP CONSTRAINT IF EXISTS user_submitted_events_event_pattern_check;

ALTER TABLE IF EXISTS public.user_submitted_events
ADD CONSTRAINT user_submitted_events_event_pattern_check
CHECK (event_pattern IS NULL OR event_pattern IN ('single', 'multi_day', 'all_day', 'custom'));

ALTER TABLE IF EXISTS public.user_submitted_events
DROP CONSTRAINT IF EXISTS user_submitted_events_pricing_type_check;

ALTER TABLE IF EXISTS public.user_submitted_events
ADD CONSTRAINT user_submitted_events_pricing_type_check
CHECK (pricing_type IS NULL OR pricing_type IN ('Free', 'Paid', 'Varies'));

ALTER TABLE IF EXISTS public.user_submitted_events
DROP CONSTRAINT IF EXISTS user_submitted_events_difficulty_level_check;

ALTER TABLE IF EXISTS public.user_submitted_events
ADD CONSTRAINT user_submitted_events_difficulty_level_check
CHECK (difficulty_level IS NULL OR difficulty_level IN ('beginner', 'intermediate', 'advanced'));
