ALTER TABLE IF EXISTS public.user_submitted_events
ADD COLUMN IF NOT EXISTS submitted_payload jsonb,
ADD COLUMN IF NOT EXISTS approved_payload jsonb,
ADD COLUMN IF NOT EXISTS submission_fingerprint text,
ADD COLUMN IF NOT EXISTS risk_flags text[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS validation_summary jsonb;

UPDATE public.user_submitted_events
SET submitted_payload = jsonb_strip_nulls(
    jsonb_build_object(
        'title', title,
        'description', description,
        'event_type', event_type,
        'organizer_name', organizer_name,
        'organizer_details', organizer_details,
        'start_date', start_date,
        'end_date', end_date,
        'timezone', timezone,
        'event_format', COALESCE(event_format, CASE WHEN is_virtual = true THEN 'Online' ELSE 'In-person' END),
        'is_virtual', is_virtual,
        'location', location,
        'location_city', location_city,
        'location_state', location_state,
        'location_country', location_country,
        'virtual_platform', virtual_platform,
        'event_pattern', event_pattern,
        'is_multi_day', is_multi_day,
        'language', language,
        'difficulty_level', difficulty_level,
        'capacity', capacity,
        'attendee_count', attendee_count,
        'certificate_offered', certificate_offered,
        'recording_available', recording_available,
        'social_media_hashtag', social_media_hashtag,
        'target_audience', target_audience,
        'prerequisites', prerequisites,
        'accessibility_features', accessibility_features,
        'source_url', source_url,
        'registration_url', registration_url,
        'livestream_url', livestream_url,
        'event_image_url', event_image_url,
        'agenda_url', agenda_url,
        'pricing_type', pricing_type,
        'price_min', price_min,
        'price_max', price_max,
        'currency', currency,
        'registration_deadline', registration_deadline,
        'speaker_lineup', speaker_lineup,
        'tags', tags,
        'series_details', series_details
    )
)
WHERE submitted_payload IS NULL;

UPDATE public.user_submitted_events
SET submission_fingerprint = md5(
    lower(coalesce(title, '')) || '|' ||
    coalesce(start_date::text, '') || '|' ||
    lower(coalesce(organizer_name, '')) || '|' ||
    coalesce(source_url, '') || '|' ||
    coalesce(registration_url, '') || '|' ||
    coalesce(event_format, CASE WHEN is_virtual = true THEN 'Online' ELSE 'In-person' END, '')
)
WHERE submission_fingerprint IS NULL;

UPDATE public.user_submitted_events
SET risk_flags = '{}'::text[]
WHERE risk_flags IS NULL;

UPDATE public.user_submitted_events
SET validation_summary = jsonb_build_object(
    'schema_version', 1,
    'normalized_at', COALESCE(created_at::text, now()::text),
    'warnings', '[]'::jsonb
)
WHERE validation_summary IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_submitted_events_submission_fingerprint
ON public.user_submitted_events (submission_fingerprint);

CREATE INDEX IF NOT EXISTS idx_user_submitted_events_status_created_at
ON public.user_submitted_events (status, created_at DESC);
