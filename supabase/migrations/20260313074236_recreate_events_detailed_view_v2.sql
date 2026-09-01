DROP VIEW IF EXISTS public.events_detailed CASCADE;

CREATE VIEW public.events_detailed AS
 SELECT e.id,
    e.created_at,
    e.updated_at,
    e.title,
    e.description,
    e.end_time,
    COALESCE(e.location, (v.name)::text) AS location,
    e.status,
    e.event_type_id,
    e.source_url,
    e.livestream_url,
    e.start_time,
    e.event_format,
    (e.event_format)::text AS "Remote/In-person",
    e.organizer_id,
    e.venue_id,
    e.series_id,
    e.registration_deadline,
    e.capacity,
    e.price_min,
    e.price_max,
    (concat(e.price_min, ' - ', e.price_max))::character varying(100) AS price_range,
    e.registration_url,
    e.event_image_url,
    e.timezone,
    e.difficulty_level,
    e.language,
    e.virtual_platform,
    e.attendee_count,
    e.social_media_hashtag,
    e.agenda_url,
    e.speaker_lineup,
    e.prerequisites,
    e.target_audience,
    e.certificate_offered,
    e.recording_available,
    e.accessibility_features,
    e.slug,
    e.location_city,
    e.location_state,
    e.location_country,
    et.name AS event_type_name,
    et.color AS event_type_color,
    o.name AS organizer_name,
    o.website_url AS organizer_website,
    o.logo_url AS organizer_logo_url,
    v.name AS venue_name,
    v.city AS venue_city,
    v.country AS venue_country,
    es.name AS series_name,
    COALESCE(array_agg(DISTINCT tag.event_tag) FILTER (WHERE (tag.event_tag IS NOT NULL)), ARRAY[]::character varying[]) AS tags
   FROM ((((((events e
     LEFT JOIN event_type et ON ((e.event_type_id = et.id)))
     LEFT JOIN organizers o ON ((e.organizer_id = o.id)))
     LEFT JOIN venues v ON ((e.venue_id = v.id)))
     LEFT JOIN event_series es ON ((e.series_id = es.id)))
     LEFT JOIN event_tag_relations etr ON ((e.id = etr.event_id)))
     LEFT JOIN event_tags tag ON ((etr.tag_id = tag.id)))
  GROUP BY e.id, et.name, et.color, o.name, o.website_url, o.logo_url, v.name, v.city, v.country, es.name;;
