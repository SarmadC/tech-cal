
-- ==========================================================================
-- SECURITY: Revoke dangerous function grants, enable RLS on unprotected
-- tables, fix view security, fix mutable search_path
-- ==========================================================================

-- 1. antigravity_exec_sql: arbitrary SQL execution by any user — revoke all
REVOKE EXECUTE ON FUNCTION public.antigravity_exec_sql(query text) FROM anon, authenticated;

-- 2. make_user_admin: privilege escalation — revoke from anon and authenticated
REVOKE EXECUTE ON FUNCTION public.make_user_admin(user_email text) FROM anon, authenticated;

-- 3. Admin/service-only functions — revoke from anon
REVOKE EXECUTE ON FUNCTION public.apply_event_update_queue_approval(uuid, uuid, jsonb, jsonb, jsonb, jsonb, uuid[], uuid[], jsonb, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.approve_user_submitted_event(uuid, uuid, text, text, jsonb, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_pending_source_events(integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_data() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_interactions() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_analytics_health() FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_webhook_event(text, text, text, jsonb, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.replace_event_agenda(uuid, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.find_event_by_external_id(text, text) FROM anon;

-- 4. Auth-required functions — revoke from anon
REVOKE EXECUTE ON FUNCTION public.accept_team_invite(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.batch_insert_interactions(json[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.batch_insert_interactions_v2(json[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_dashboard_data(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_growth_analytics(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.toggle_bookmark(uuid, uuid, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.track_event_and_update_profile(uuid, uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.untrack_event_and_update_profile(uuid, uuid) FROM anon;

-- 5a. Enable RLS on event_identity_keys (internal dedup table — no public access needed)
ALTER TABLE public.event_identity_keys ENABLE ROW LEVEL SECURITY;

-- 5b. Enable RLS on event_networking_summary with owner access
ALTER TABLE public.event_networking_summary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event_networking_summary_owner_access" ON public.event_networking_summary
  USING ((select auth.uid()) = user_id);

-- 5c. Enable RLS on user_networking_contacts with owner access
ALTER TABLE public.user_networking_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_networking_contacts_owner_access" ON public.user_networking_contacts
  USING ((select auth.uid()) = viewer_user_id);

-- 6. Fix events_detailed view: security_invoker so RLS is respected
ALTER VIEW public.events_detailed SET (security_invoker = true);

-- 7. Fix mutable search_path on trigger function
ALTER FUNCTION public.update_user_submitted_events_updated_at() SET search_path = '';
;
