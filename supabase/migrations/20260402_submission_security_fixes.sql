UPDATE public.user_submitted_events
SET submission_fingerprint = md5(
    lower(coalesce(title, '')) || '|' ||
    coalesce(start_date::text, '') || '|' ||
    lower(coalesce(organizer_name, '')) || '|' ||
    coalesce(source_url, '') || '|' ||
    coalesce(registration_url, '') || '|' ||
    coalesce(event_format, CASE WHEN is_virtual = true THEN 'Online' ELSE 'In-person' END, '')
)
WHERE submission_fingerprint IS DISTINCT FROM md5(
    lower(coalesce(title, '')) || '|' ||
    coalesce(start_date::text, '') || '|' ||
    lower(coalesce(organizer_name, '')) || '|' ||
    coalesce(source_url, '') || '|' ||
    coalesce(registration_url, '') || '|' ||
    coalesce(event_format, CASE WHEN is_virtual = true THEN 'Online' ELSE 'In-person' END, '')
);

CREATE OR REPLACE FUNCTION public.approve_user_submitted_event(
    p_submission_id uuid,
    p_reviewed_by uuid,
    p_admin_notes text,
    p_submission_fingerprint text,
    p_approved_payload jsonb,
    p_enrichment_metadata jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_submission public.user_submitted_events%ROWTYPE;
    v_event_id uuid;
BEGIN
    SELECT *
    INTO v_submission
    FROM public.user_submitted_events
    WHERE id = p_submission_id
      AND status = 'pending'
      AND reviewed_at IS NULL
      AND event_id IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    INSERT INTO public.events (
        title,
        description,
        start_time,
        end_time,
        location,
        location_city,
        location_state,
        location_country,
        timezone,
        event_format,
        event_pattern,
        is_multi_day,
        language,
        difficulty_level,
        capacity,
        attendee_count,
        certificate_offered,
        recording_available,
        social_media_hashtag,
        virtual_platform,
        target_audience,
        prerequisites,
        source_url,
        registration_url,
        livestream_url,
        event_image_url,
        agenda_url,
        registration_mode,
        pricing_type,
        price_min,
        price_max,
        currency,
        registration_deadline,
        accessibility_features,
        speaker_lineup,
        status,
        ingestion_provenance,
        enrichment_status,
        enrichment_metadata
    )
    VALUES (
        p_approved_payload ->> 'title',
        NULLIF(p_approved_payload ->> 'description', ''),
        (p_approved_payload ->> 'start_time')::timestamptz,
        NULLIF(p_approved_payload ->> 'end_time', '')::timestamptz,
        NULLIF(p_approved_payload ->> 'location', ''),
        NULLIF(p_approved_payload ->> 'location_city', ''),
        NULLIF(p_approved_payload ->> 'location_state', ''),
        NULLIF(p_approved_payload ->> 'location_country', ''),
        NULLIF(p_approved_payload ->> 'timezone', ''),
        NULLIF(p_approved_payload ->> 'event_format', '')::public.event_format_enum,
        NULLIF(p_approved_payload ->> 'event_pattern', ''),
        COALESCE((p_approved_payload ->> 'is_multi_day')::boolean, false),
        NULLIF(p_approved_payload ->> 'language', ''),
        NULLIF(p_approved_payload ->> 'difficulty_level', ''),
        NULLIF(p_approved_payload ->> 'capacity', '')::integer,
        NULLIF(p_approved_payload ->> 'attendee_count', '')::integer,
        COALESCE((p_approved_payload ->> 'certificate_offered')::boolean, false),
        COALESCE((p_approved_payload ->> 'recording_available')::boolean, false),
        NULLIF(p_approved_payload ->> 'social_media_hashtag', ''),
        NULLIF(p_approved_payload ->> 'virtual_platform', ''),
        NULLIF(p_approved_payload ->> 'target_audience', ''),
        NULLIF(p_approved_payload ->> 'prerequisites', ''),
        NULLIF(p_approved_payload ->> 'source_url', ''),
        NULLIF(p_approved_payload ->> 'registration_url', ''),
        NULLIF(p_approved_payload ->> 'livestream_url', ''),
        NULLIF(p_approved_payload ->> 'event_image_url', ''),
        NULLIF(p_approved_payload ->> 'agenda_url', ''),
        NULLIF(p_approved_payload ->> 'registration_mode', ''),
        NULLIF(p_approved_payload ->> 'pricing_type', '')::public.pricing_type_enum,
        NULLIF(p_approved_payload ->> 'price_min', '')::numeric,
        NULLIF(p_approved_payload ->> 'price_max', '')::numeric,
        NULLIF(p_approved_payload ->> 'currency', ''),
        NULLIF(p_approved_payload ->> 'registration_deadline', '')::timestamptz,
        CASE
            WHEN jsonb_typeof(p_approved_payload -> 'accessibility_features') = 'object'
                THEN p_approved_payload -> 'accessibility_features'
            ELSE NULL
        END,
        CASE
            WHEN jsonb_typeof(p_approved_payload -> 'speaker_lineup') = 'array'
                THEN p_approved_payload -> 'speaker_lineup'
            ELSE NULL
        END,
        'confirmed',
        to_jsonb('user_submitted'::text),
        'pending',
        p_enrichment_metadata
    )
    RETURNING id INTO v_event_id;

    UPDATE public.user_submitted_events
    SET status = 'approved',
        admin_notes = p_admin_notes,
        reviewed_by = p_reviewed_by,
        reviewed_at = now(),
        approved_payload = p_approved_payload,
        submission_fingerprint = p_submission_fingerprint,
        event_id = v_event_id
    WHERE id = p_submission_id;

    RETURN v_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_user_submitted_event(uuid, uuid, text, text, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_user_submitted_event(uuid, uuid, text, text, jsonb, jsonb) TO service_role;
