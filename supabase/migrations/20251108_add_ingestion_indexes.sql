-- Add indexes to support ingestion and enrichment queries

-- Ensure pg_trgm extension is available for trigram indexes
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Indexes on events table for source and registration URLs
CREATE INDEX IF NOT EXISTS idx_events_source_url
    ON public.events USING btree (source_url);

CREATE INDEX IF NOT EXISTS idx_events_registration_url
    ON public.events USING btree (registration_url);

-- Trigram index to accelerate fuzzy title searches used in deduplication
CREATE INDEX IF NOT EXISTS idx_events_title_trgm
    ON public.events USING gin (title gin_trgm_ops);

-- Index on source_events checksum to speed up duplicate detection
CREATE INDEX IF NOT EXISTS idx_source_events_checksum
    ON public.source_events USING btree (checksum);




