-- Enable RLS on tables that are missing it
-- These tables are accessible via PostgREST API and need row-level security

-- Enable RLS on all tables that need it
ALTER TABLE public.page_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extraction_job_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_trust_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_blocklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_allowlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_events_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_field_protection_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_field_edits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_update_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_update_queue_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_update_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for service role (full access)
-- These tables are primarily used by backend services, so service role gets full access

-- page_cache: Service role can manage, authenticated users can read own cached pages
CREATE POLICY "Service role can manage page_cache"
  ON public.page_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- extraction_job_log: Service role can manage, authenticated users can read (limited)
CREATE POLICY "Service role can manage extraction_job_log"
  ON public.extraction_job_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ingestion_jobs: Service role can manage
CREATE POLICY "Service role can manage ingestion_jobs"
  ON public.ingestion_jobs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- event_moderation_queue: Service role and admins can manage
CREATE POLICY "Service role can manage event_moderation_queue"
  ON public.event_moderation_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view event_moderation_queue"
  ON public.event_moderation_queue
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- source_trust_scores: Service role can manage
CREATE POLICY "Service role can manage source_trust_scores"
  ON public.source_trust_scores
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- source_blocklist: Service role and admins can manage
CREATE POLICY "Service role can manage source_blocklist"
  ON public.source_blocklist
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view source_blocklist"
  ON public.source_blocklist
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- source_allowlist: Service role and admins can manage
CREATE POLICY "Service role can manage source_allowlist"
  ON public.source_allowlist
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view source_allowlist"
  ON public.source_allowlist
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ingestion_events_filters: Service role can manage
CREATE POLICY "Service role can manage ingestion_events_filters"
  ON public.ingestion_events_filters
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- event_field_protection_config: Service role and admins can manage
CREATE POLICY "Service role can manage event_field_protection_config"
  ON public.event_field_protection_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can manage event_field_protection_config"
  ON public.event_field_protection_config
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- event_field_edits: Service role and admins can manage
CREATE POLICY "Service role can manage event_field_edits"
  ON public.event_field_edits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view event_field_edits"
  ON public.event_field_edits
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- event_update_queue: Service role and admins can manage
CREATE POLICY "Service role can manage event_update_queue"
  ON public.event_update_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view event_update_queue"
  ON public.event_update_queue
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- event_update_queue_fields: Service role and admins can manage
CREATE POLICY "Service role can manage event_update_queue_fields"
  ON public.event_update_queue_fields
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view event_update_queue_fields"
  ON public.event_update_queue_fields
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- event_update_log: Service role and admins can view
CREATE POLICY "Service role can manage event_update_log"
  ON public.event_update_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view event_update_log"
  ON public.event_update_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

