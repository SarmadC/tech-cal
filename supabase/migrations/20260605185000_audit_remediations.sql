-- 1. storage SELECT policy removals (prevent programmatic listing, public URL download remains active)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public community media access" ON storage.objects;

-- 2. Add composite primary key to public.event_identity_keys
ALTER TABLE "public"."event_identity_keys" ADD PRIMARY KEY (event_id, key_type, key_hash);

-- 3. Enable RLS and add policy to public.event_identity_keys
ALTER TABLE "public"."event_identity_keys" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_service_manage_event_identity_keys" ON "public"."event_identity_keys";
CREATE POLICY "admin_service_manage_event_identity_keys" ON "public"."event_identity_keys"
AS PERMISSIVE FOR ALL
TO public
USING (is_admin() OR is_service_role())
WITH CHECK (is_admin() OR is_service_role());

-- 4. Create covering index for team_invites covering foreign key fk_team_invite_team_hackathon
CREATE INDEX IF NOT EXISTS idx_team_invites_team_hackathon ON public.team_invites(team_id, hackathon_id);

-- 5. Split ALL policies on circle tables to avoid permissive policy overlaps
-- circle_event_links
DROP POLICY IF EXISTS "circle_event_links_write" ON public.circle_event_links;
CREATE POLICY "circle_event_links_insert" ON public.circle_event_links FOR INSERT WITH CHECK (
  (EXISTS ( SELECT 1 FROM circles c WHERE ((c.id = circle_event_links.circle_id) AND ((c.owner_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1 FROM circle_moderators m WHERE ((m.circle_id = c.id) AND (m.user_id = ( SELECT auth.uid() AS uid)))))))))
);
CREATE POLICY "circle_event_links_update" ON public.circle_event_links FOR UPDATE USING (
  (EXISTS ( SELECT 1 FROM circles c WHERE ((c.id = circle_event_links.circle_id) AND ((c.owner_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1 FROM circle_moderators m WHERE ((m.circle_id = c.id) AND (m.user_id = ( SELECT auth.uid() AS uid)))))))))
);
CREATE POLICY "circle_event_links_delete" ON public.circle_event_links FOR DELETE USING (
  (EXISTS ( SELECT 1 FROM circles c WHERE ((c.id = circle_event_links.circle_id) AND ((c.owner_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1 FROM circle_moderators m WHERE ((m.circle_id = c.id) AND (m.user_id = ( SELECT auth.uid() AS uid)))))))))
);

-- circle_moderators
DROP POLICY IF EXISTS "circle_moderators_write" ON public.circle_moderators;
CREATE POLICY "circle_moderators_insert" ON public.circle_moderators FOR INSERT WITH CHECK (
  (EXISTS ( SELECT 1 FROM circles c WHERE ((c.id = circle_moderators.circle_id) AND (c.owner_id = ( SELECT auth.uid() AS uid)))))
);
CREATE POLICY "circle_moderators_update" ON public.circle_moderators FOR UPDATE USING (
  (EXISTS ( SELECT 1 FROM circles c WHERE ((c.id = circle_moderators.circle_id) AND (c.owner_id = ( SELECT auth.uid() AS uid)))))
);
CREATE POLICY "circle_moderators_delete" ON public.circle_moderators FOR DELETE USING (
  (EXISTS ( SELECT 1 FROM circles c WHERE ((c.id = circle_moderators.circle_id) AND (c.owner_id = ( SELECT auth.uid() AS uid)))))
);

-- circle_post_links
DROP POLICY IF EXISTS "circle_post_links_author_write" ON public.circle_post_links;
CREATE POLICY "circle_post_links_author_insert" ON public.circle_post_links FOR INSERT WITH CHECK (
  (EXISTS ( SELECT 1 FROM circle_posts p WHERE ((p.id = circle_post_links.post_id) AND (p.author_id = ( SELECT auth.uid() AS uid)))))
);
CREATE POLICY "circle_post_links_author_update" ON public.circle_post_links FOR UPDATE USING (
  (EXISTS ( SELECT 1 FROM circle_posts p WHERE ((p.id = circle_post_links.post_id) AND (p.author_id = ( SELECT auth.uid() AS uid)))))
);
CREATE POLICY "circle_post_links_author_delete" ON public.circle_post_links FOR DELETE USING (
  (EXISTS ( SELECT 1 FROM circle_posts p WHERE ((p.id = circle_post_links.post_id) AND (p.author_id = ( SELECT auth.uid() AS uid)))))
);

-- circle_post_pins
DROP POLICY IF EXISTS "circle_post_pins_write" ON public.circle_post_pins;
CREATE POLICY "circle_post_pins_insert" ON public.circle_post_pins FOR INSERT WITH CHECK (
  (EXISTS ( SELECT 1 FROM circles c WHERE ((c.id = circle_post_pins.circle_id) AND ((c.owner_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1 FROM circle_moderators m WHERE ((m.circle_id = c.id) AND (m.user_id = ( SELECT auth.uid() AS uid)))))))))
);
CREATE POLICY "circle_post_pins_update" ON public.circle_post_pins FOR UPDATE USING (
  (EXISTS ( SELECT 1 FROM circles c WHERE ((c.id = circle_post_pins.circle_id) AND ((c.owner_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1 FROM circle_moderators m WHERE ((m.circle_id = c.id) AND (m.user_id = ( SELECT auth.uid() AS uid)))))))))
);
CREATE POLICY "circle_post_pins_delete" ON public.circle_post_pins FOR DELETE USING (
  (EXISTS ( SELECT 1 FROM circles c WHERE ((c.id = circle_post_pins.circle_id) AND ((c.owner_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1 FROM circle_moderators m WHERE ((m.circle_id = c.id) AND (m.user_id = ( SELECT auth.uid() AS uid)))))))))
);

-- Restrict events_public_read policy to authenticated role only
DROP POLICY IF EXISTS "events_public_read" ON public.events;
CREATE POLICY "events_public_read" ON public.events FOR SELECT TO authenticated USING (true);

-- 6. Revoke default EXECUTE from PUBLIC for all SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.accept_team_invite(p_invite_id uuid, p_user_id uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.antigravity_exec_sql(query text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_event_update_queue_approval(p_queue_id uuid, p_reviewed_by uuid, p_scalar_updates jsonb DEFAULT '{}'::jsonb, p_relationship_updates jsonb DEFAULT '{}'::jsonb, p_speaker_updates jsonb DEFAULT '[]'::jsonb, p_agenda_updates jsonb DEFAULT '[]'::jsonb, p_approved_field_ids uuid[] DEFAULT '{}'::uuid[], p_rejected_field_ids uuid[] DEFAULT '{}'::uuid[], p_sanitized_field_updates jsonb DEFAULT '[]'::jsonb, p_reject_remaining_pending boolean DEFAULT false) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.approve_user_submitted_event(p_submission_id uuid, p_reviewed_by uuid, p_admin_notes text, p_submission_fingerprint text, p_approved_payload jsonb, p_enrichment_metadata jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.batch_insert_interactions(interactions json[]) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.batch_insert_interactions_v2(interactions json[]) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_event_room_thread_activity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_bookmark_rate_limit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_notification_limits() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_pending_source_events(p_limit integer DEFAULT 100, p_processing_status text DEFAULT 'processing'::text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_data() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_interactions() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_circle_comment_with_notification(payload jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_circle_post_with_rich_content(p_circle_id uuid, p_content text, p_post_type text DEFAULT NULL::text, p_event_id uuid DEFAULT NULL::uuid, p_mentions uuid[] DEFAULT '{}'::uuid[], p_media jsonb DEFAULT '[]'::jsonb, p_title text DEFAULT NULL::text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_subscription_for_new_profile() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.event_room_thread_decrement_comment_count(p_thread_id uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.filter_events(p_search_term text DEFAULT NULL::text, p_categories uuid[] DEFAULT NULL::uuid[], p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_event_format text DEFAULT 'all'::text, p_budget text DEFAULT 'all'::text, p_currency text DEFAULT NULL::text, p_cost text DEFAULT 'all'::text, p_popularity text DEFAULT 'all'::text, p_duration text DEFAULT 'all'::text, p_my_network boolean DEFAULT false, p_recommended boolean DEFAULT false, p_page_num integer DEFAULT 1, p_page_size integer DEFAULT 50, p_sort_by text DEFAULT 'date'::text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.find_event_by_external_id(p_external_id text, p_source text DEFAULT NULL::text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.find_similar_events(p_title text, p_start_time timestamp with time zone, p_similarity_threshold real DEFAULT 0.6, p_organizer_id uuid DEFAULT NULL::uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_analytics_health() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_event_connection_counts_for_user(p_user_id uuid, p_event_ids uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_mutual_attendees_for_events(p_viewer_id uuid, p_target_id uuid, p_event_ids uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_dashboard_data(user_uuid uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_growth_analytics(p_user_id uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_circle_member_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_event_schedule_integrity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_service_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_valid_email(email text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_changes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_webhook_event(p_source text, p_action text, p_external_id text, p_payload jsonb, p_signature_verified boolean DEFAULT false) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.make_user_admin(user_email text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_admin_self_promotion() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_email_changes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_circle_active_member_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_timezone_cache() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.replace_event_agenda(p_event_id uuid, p_items jsonb DEFAULT '[]'::jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_social_rows_for_profile() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_social_stats_from_follows() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.toggle_bookmark(p_user_id uuid, p_event_id uuid, p_is_bookmarked boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.track_event_and_update_profile(p_user_id uuid, p_event_id uuid, p_status text, p_notes text DEFAULT NULL::text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.untrack_event_and_update_profile(p_user_id uuid, p_event_id uuid) FROM PUBLIC, anon, authenticated;

-- Grant permissions back specifically where needed
GRANT EXECUTE ON FUNCTION public.accept_team_invite(p_invite_id uuid, p_user_id uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apply_event_update_queue_approval(p_queue_id uuid, p_reviewed_by uuid, p_scalar_updates jsonb DEFAULT '{}'::jsonb, p_relationship_updates jsonb DEFAULT '{}'::jsonb, p_speaker_updates jsonb DEFAULT '[]'::jsonb, p_agenda_updates jsonb DEFAULT '[]'::jsonb, p_approved_field_ids uuid[] DEFAULT '{}'::uuid[], p_rejected_field_ids uuid[] DEFAULT '{}'::uuid[], p_sanitized_field_updates jsonb DEFAULT '[]'::jsonb, p_reject_remaining_pending boolean DEFAULT false) TO service_role;
GRANT EXECUTE ON FUNCTION public.approve_user_submitted_event(p_submission_id uuid, p_reviewed_by uuid, p_admin_notes text, p_submission_fingerprint text, p_approved_payload jsonb, p_enrichment_metadata jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.batch_insert_interactions(interactions json[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.batch_insert_interactions_v2(interactions json[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.bump_event_room_thread_activity() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_bookmark_rate_limit() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_notification_limits() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_pending_source_events(p_limit integer DEFAULT 100, p_processing_status text DEFAULT 'processing'::text) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_data() TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_interactions() TO service_role;
GRANT EXECUTE ON FUNCTION public.create_circle_comment_with_notification(payload jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_circle_post_with_rich_content(p_circle_id uuid, p_content text, p_post_type text DEFAULT NULL::text, p_event_id uuid DEFAULT NULL::uuid, p_mentions uuid[] DEFAULT '{}'::uuid[], p_media jsonb DEFAULT '[]'::jsonb, p_title text DEFAULT NULL::text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.event_room_thread_decrement_comment_count(p_thread_id uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.filter_events(p_search_term text DEFAULT NULL::text, p_categories uuid[] DEFAULT NULL::uuid[], p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_event_format text DEFAULT 'all'::text, p_budget text DEFAULT 'all'::text, p_currency text DEFAULT NULL::text, p_cost text DEFAULT 'all'::text, p_popularity text DEFAULT 'all'::text, p_duration text DEFAULT 'all'::text, p_my_network boolean DEFAULT false, p_recommended boolean DEFAULT false, p_page_num integer DEFAULT 1, p_page_size integer DEFAULT 50, p_sort_by text DEFAULT 'date'::text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.find_event_by_external_id(p_external_id text, p_source text DEFAULT NULL::text) TO service_role;
GRANT EXECUTE ON FUNCTION public.find_similar_events(p_title text, p_start_time timestamp with time zone, p_similarity_threshold real DEFAULT 0.6, p_organizer_id uuid DEFAULT NULL::uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_analytics_health() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_event_connection_counts_for_user(p_user_id uuid, p_event_ids uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_mutual_attendees_for_events(p_viewer_id uuid, p_target_id uuid, p_event_ids uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_dashboard_data(user_uuid uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_growth_analytics(p_user_id uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_service_role() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_valid_email(email text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_webhook_event(p_source text, p_action text, p_external_id text, p_payload jsonb, p_signature_verified boolean DEFAULT false) TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_circle_active_member_count() TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_timezone_cache() TO service_role;
GRANT EXECUTE ON FUNCTION public.replace_event_agenda(p_event_id uuid, p_items jsonb DEFAULT '[]'::jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_social_stats_from_follows() TO service_role;
GRANT EXECUTE ON FUNCTION public.toggle_bookmark(p_user_id uuid, p_event_id uuid, p_is_bookmarked boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.track_event_and_update_profile(p_user_id uuid, p_event_id uuid, p_status text, p_notes text DEFAULT NULL::text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.untrack_event_and_update_profile(p_user_id uuid, p_event_id uuid) TO authenticated, service_role;