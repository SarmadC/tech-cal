-- Convert SECURITY DEFINER views to SECURITY INVOKER where appropriate
-- SECURITY DEFINER views execute with creator's privileges, which can bypass RLS
-- SECURITY INVOKER views execute with querying user's privileges (default behavior)

-- Note: Some views may intentionally use SECURITY DEFINER for performance reasons,
-- but these should be carefully reviewed. Most analytics views should use SECURITY INVOKER
-- and rely on RLS policies on underlying tables for security.

-- event_speakers_flat - Should be SECURITY INVOKER (joins public tables with RLS)
CREATE OR REPLACE VIEW public.event_speakers_flat
WITH (security_invoker = true)
AS
SELECT DISTINCT
  ea.event_id,
  s.id   as speaker_id,
  s.name as speaker_name
FROM public.event_agenda ea
JOIN public.agenda_speakers asg ON asg.agenda_id = ea.id
JOIN public.speakers s ON s.id = asg.speaker_id;

-- agenda_speakers_with_event - Should be SECURITY INVOKER
CREATE OR REPLACE VIEW public.agenda_speakers_with_event
WITH (security_invoker = true)
AS
SELECT ags.agenda_id,
    ags.speaker_id,
    ags.created_at,
    ags.event_id,
    e.title AS event_title
FROM ((public.agenda_speakers ags
     JOIN public.event_agenda ea ON ((ags.agenda_id = ea.id)))
     JOIN public.events e ON ((ea.event_id = e.id)));

-- event_speaker_list - Should be SECURITY INVOKER (aggregates from event_speakers_flat)
CREATE OR REPLACE VIEW public.event_speaker_list
WITH (security_invoker = true)
AS
SELECT event_id,
    array_agg(DISTINCT speaker_name ORDER BY speaker_name) AS speakers
FROM public.event_speakers_flat es
GROUP BY event_id;

-- events_with_location - Should be SECURITY INVOKER (joins events and venues with RLS)
CREATE OR REPLACE VIEW public.events_with_location
WITH (security_invoker = true)
AS
SELECT e.id,
    e.title,
    e.description,
    e.start_time,
    e.end_time,
    e.timezone,
    e.location AS location_text,
    e.location_normalized,
    COALESCE(v.city, e.location_city) AS city,
    COALESCE(v.state_province, e.location_state) AS state,
    COALESCE(v.country, e.location_country) AS country,
    COALESCE(v.latitude, e.location_latitude) AS latitude,
    COALESCE(v.longitude, e.location_longitude) AS longitude,
    COALESCE(v.name, (e.location)::character varying) AS venue_name,
    v.address AS venue_address,
    v.venue_type,
    v.capacity AS venue_capacity,
    e.venue_id,
    e.event_format,
    e.organizer_id,
    e.event_type_id,
    e.status,
    e.created_at,
    e.updated_at
FROM (public.events e
     LEFT JOIN public.venues v ON ((e.venue_id = v.id)));

-- telemetry_recommendation_batches_last7d - Analytics view, keep SECURITY DEFINER with comment
-- This view aggregates telemetry data and may intentionally use SECURITY DEFINER
-- for performance. However, the underlying table should have proper RLS policies.
-- Review whether SECURITY INVOKER would be more appropriate for your use case.
-- For now, converting to SECURITY INVOKER since telemetry_events has RLS.
CREATE OR REPLACE VIEW public.telemetry_recommendation_batches_last7d
WITH (security_invoker = true)
AS
SELECT count(*) AS total_batches,
    avg(COALESCE(((metadata ->> 'returnedCount'::text))::numeric, (jsonb_array_length((metadata -> 'recommendationIds'::text)))::numeric)) AS avg_returned_count
FROM public.telemetry_events
WHERE ((event_type = 'recommendation_batch_generated'::text) AND (occurred_at >= (now() - '7 days'::interval)));

-- telemetry_skill_ratings_last7d - Analytics view, convert to SECURITY INVOKER
CREATE OR REPLACE VIEW public.telemetry_skill_ratings_last7d
WITH (security_invoker = true)
AS
SELECT (metadata ->> 'skill'::text) AS skill,
    (metadata ->> 'proficiency'::text) AS proficiency,
    count(*) AS rating_count
FROM public.telemetry_events
WHERE ((event_type = 'skill_rating_saved'::text) AND (occurred_at >= (now() - '7 days'::interval)) AND ((metadata ->> 'skill'::text) IS NOT NULL))
GROUP BY (metadata ->> 'skill'::text), (metadata ->> 'proficiency'::text)
ORDER BY (count(*)) DESC;

-- telemetry_recommendation_interactions_last7d - Analytics view, convert to SECURITY INVOKER
CREATE OR REPLACE VIEW public.telemetry_recommendation_interactions_last7d
WITH (security_invoker = true)
AS
SELECT (metadata ->> 'interactionType'::text) AS interaction_type,
    count(*) AS total_events,
    count(DISTINCT COALESCE((user_id)::text, (context ->> 'anonymousId'::text))) AS unique_users,
    avg(NULLIF(((metadata ->> 'position'::text))::integer, 0)) AS avg_position
FROM public.telemetry_events
WHERE ((event_type = 'recommendation_interaction'::text) AND (occurred_at >= (now() - '7 days'::interval)))
GROUP BY (metadata ->> 'interactionType'::text)
ORDER BY (count(*)) DESC;

-- firecrawl_enrichment_stats - Analytics view, convert to SECURITY INVOKER
-- Note: This accesses events table which has RLS, so SECURITY INVOKER is appropriate
CREATE OR REPLACE VIEW public.firecrawl_enrichment_stats
WITH (security_invoker = true)
AS
SELECT enrichment_status AS status,
    (enrichment_metadata ->> 'enrichment_strategy'::text) AS strategy,
    (enrichment_metadata ->> 'site_complexity'::text) AS complexity,
    count(*) AS event_count,
    round(avg(((enrichment_metadata ->> 'extraction_quality_score'::text))::numeric), 2) AS avg_quality_score,
    round(avg(((enrichment_metadata ->> 'credits_used'::text))::numeric), 2) AS avg_credits_used,
    round(avg(((enrichment_metadata ->> 'pages_crawled'::text))::numeric), 2) AS avg_pages_crawled,
    max((enrichment_metadata ->> 'completed_at'::text)) AS last_completed
FROM public.events
WHERE (enrichment_metadata IS NOT NULL)
GROUP BY enrichment_status, (enrichment_metadata ->> 'enrichment_strategy'::text), (enrichment_metadata ->> 'site_complexity'::text);

-- firecrawl_retry_stats - Analytics view, convert to SECURITY INVOKER
CREATE OR REPLACE VIEW public.firecrawl_retry_stats
WITH (security_invoker = true)
AS
SELECT count(*) AS total_events,
    count(
        CASE
            WHEN (((enrichment_metadata ->> 'retry_count'::text))::integer = 0) THEN 1
            ELSE NULL::integer
        END) AS no_retries,
    count(
        CASE
            WHEN (((enrichment_metadata ->> 'retry_count'::text))::integer > 0) THEN 1
            ELSE NULL::integer
        END) AS with_retries,
    round(avg(((enrichment_metadata ->> 'retry_count'::text))::numeric), 2) AS avg_retries,
    (max(((enrichment_metadata ->> 'retry_count'::text))::numeric))::integer AS max_retries
FROM public.events
WHERE (enrichment_metadata IS NOT NULL);

-- firecrawl_strategy_comparison - Analytics view, convert to SECURITY INVOKER
CREATE OR REPLACE VIEW public.firecrawl_strategy_comparison
WITH (security_invoker = true)
AS
SELECT (enrichment_metadata ->> 'enrichment_strategy'::text) AS strategy,
    enrichment_status AS status,
    count(*) AS count,
    round(((100.0 * (count(*))::numeric) / sum(count(*)) OVER (PARTITION BY (enrichment_metadata ->> 'enrichment_strategy'::text))), 1) AS pct_of_strategy,
    round(avg(((enrichment_metadata ->> 'credits_used'::text))::numeric), 2) AS avg_credits,
    round(avg(((enrichment_metadata ->> 'extraction_quality_score'::text))::numeric), 2) AS avg_quality
FROM public.events
WHERE ((enrichment_metadata IS NOT NULL) AND ((enrichment_metadata ->> 'enrichment_strategy'::text) IS NOT NULL))
GROUP BY (enrichment_metadata ->> 'enrichment_strategy'::text), enrichment_status;

COMMENT ON VIEW public.event_speakers_flat IS 'Flat list of event-speaker relationships. Uses SECURITY INVOKER to respect RLS on underlying tables.';
COMMENT ON VIEW public.agenda_speakers_with_event IS 'Agenda speakers with event details. Uses SECURITY INVOKER to respect RLS.';
COMMENT ON VIEW public.events_with_location IS 'Events with normalized location data. Uses SECURITY INVOKER to respect RLS.';
COMMENT ON VIEW public.telemetry_recommendation_batches_last7d IS 'Analytics view for recommendation batches. Uses SECURITY INVOKER to respect RLS on telemetry_events.';
COMMENT ON VIEW public.firecrawl_enrichment_stats IS 'Analytics view for Firecrawl enrichment. Uses SECURITY INVOKER to respect RLS on events.';

