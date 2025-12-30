-- Add indexes for unindexed foreign keys to improve JOIN and FK check performance
-- Foreign keys without indexes can cause slow queries and FK constraint checks

-- agenda_speakers.event_id (used in joins and FK checks)
CREATE INDEX IF NOT EXISTS idx_agenda_speakers_event_id 
  ON public.agenda_speakers (event_id);

-- event_field_edits.edited_by (FK to profiles)
CREATE INDEX IF NOT EXISTS idx_event_field_edits_edited_by 
  ON public.event_field_edits (edited_by);

-- event_field_protection_config.updated_by (FK to profiles)
CREATE INDEX IF NOT EXISTS idx_event_field_protection_config_updated_by 
  ON public.event_field_protection_config (updated_by);

-- event_moderation_queue.event_id (used in joins)
CREATE INDEX IF NOT EXISTS idx_event_moderation_queue_event_id 
  ON public.event_moderation_queue (event_id);

-- event_moderation_queue.reviewer_id (FK to auth.users)
CREATE INDEX IF NOT EXISTS idx_event_moderation_queue_reviewer_id 
  ON public.event_moderation_queue (reviewer_id);

-- event_prerequisites.prerequisite_id (FK to prerequisites)
CREATE INDEX IF NOT EXISTS idx_event_prerequisites_prerequisite_id 
  ON public.event_prerequisites (prerequisite_id);

-- event_target_audiences.audience_id (FK to target_audiences)
CREATE INDEX IF NOT EXISTS idx_event_target_audiences_audience_id 
  ON public.event_target_audiences (audience_id);

-- event_update_queue.reviewed_by (FK to profiles)
CREATE INDEX IF NOT EXISTS idx_event_update_queue_reviewed_by 
  ON public.event_update_queue (reviewed_by);

-- event_update_queue_fields.reviewed_by (FK to profiles)
CREATE INDEX IF NOT EXISTS idx_event_update_queue_fields_reviewed_by 
  ON public.event_update_queue_fields (reviewed_by);

-- events.series_id (FK to event_series, may be used in queries)
CREATE INDEX IF NOT EXISTS idx_events_series_id 
  ON public.events (series_id);

-- ingestion_errors.source_event_id (FK to source_events)
CREATE INDEX IF NOT EXISTS idx_ingestion_errors_source_event_id 
  ON public.ingestion_errors (source_event_id);

-- source_allowlist.allowed_by (FK to auth.users)
CREATE INDEX IF NOT EXISTS idx_source_allowlist_allowed_by 
  ON public.source_allowlist (allowed_by);

-- source_blocklist.blocked_by (FK to auth.users)
CREATE INDEX IF NOT EXISTS idx_source_blocklist_blocked_by 
  ON public.source_blocklist (blocked_by);

-- Add comments for documentation
COMMENT ON INDEX idx_agenda_speakers_event_id IS 'Index for FK agenda_speakers.event_id to improve join performance';
COMMENT ON INDEX idx_event_field_edits_edited_by IS 'Index for FK event_field_edits.edited_by to improve queries filtering by editor';
COMMENT ON INDEX idx_event_field_protection_config_updated_by IS 'Index for FK event_field_protection_config.updated_by';
COMMENT ON INDEX idx_event_moderation_queue_event_id IS 'Index for FK event_moderation_queue.event_id to improve join performance';
COMMENT ON INDEX idx_event_moderation_queue_reviewer_id IS 'Index for FK event_moderation_queue.reviewer_id';
COMMENT ON INDEX idx_event_prerequisites_prerequisite_id IS 'Index for FK event_prerequisites.prerequisite_id';
COMMENT ON INDEX idx_event_target_audiences_audience_id IS 'Index for FK event_target_audiences.audience_id';
COMMENT ON INDEX idx_event_update_queue_reviewed_by IS 'Index for FK event_update_queue.reviewed_by';
COMMENT ON INDEX idx_event_update_queue_fields_reviewed_by IS 'Index for FK event_update_queue_fields.reviewed_by';
COMMENT ON INDEX idx_events_series_id IS 'Index for FK events.series_id to improve queries filtering by series';
COMMENT ON INDEX idx_ingestion_errors_source_event_id IS 'Index for FK ingestion_errors.source_event_id';
COMMENT ON INDEX idx_source_allowlist_allowed_by IS 'Index for FK source_allowlist.allowed_by';
COMMENT ON INDEX idx_source_blocklist_blocked_by IS 'Index for FK source_blocklist.blocked_by';

