-- 1. Fix functions with mutable search_path
ALTER FUNCTION public.create_subscription_for_new_profile() SET search_path = public;
ALTER FUNCTION public.update_subscription_updated_at() SET search_path = public;
ALTER FUNCTION public.antigravity_exec_sql(text) SET search_path = public;
ALTER FUNCTION public.handle_circle_member_count() SET search_path = public;
ALTER FUNCTION public.handle_updated_at() SET search_path = public;
ALTER FUNCTION public.set_attendance_status(uuid, uuid, text, text) SET search_path = public;

-- 2. Restrict overly permissive RLS policies

-- public.event_prerequisites
DROP POLICY IF EXISTS "Allow authenticated users to insert event_prerequisites" ON public.event_prerequisites;
CREATE POLICY "admin_service_insert_event_prerequisites" ON public.event_prerequisites FOR INSERT WITH CHECK (is_admin() OR is_service_role());

DROP POLICY IF EXISTS "Allow authenticated users to update event_prerequisites" ON public.event_prerequisites;
CREATE POLICY "admin_service_update_event_prerequisites" ON public.event_prerequisites FOR UPDATE USING (is_admin() OR is_service_role()) WITH CHECK (is_admin() OR is_service_role());

DROP POLICY IF EXISTS "Allow authenticated users to delete event_prerequisites" ON public.event_prerequisites;
CREATE POLICY "admin_service_delete_event_prerequisites" ON public.event_prerequisites FOR DELETE USING (is_admin() OR is_service_role());

-- public.event_target_audiences
DROP POLICY IF EXISTS "Allow authenticated users to insert event_target_audiences" ON public.event_target_audiences;
CREATE POLICY "admin_service_insert_event_target_audiences" ON public.event_target_audiences FOR INSERT WITH CHECK (is_admin() OR is_service_role());

DROP POLICY IF EXISTS "Allow authenticated users to update event_target_audiences" ON public.event_target_audiences;
CREATE POLICY "admin_service_update_event_target_audiences" ON public.event_target_audiences FOR UPDATE USING (is_admin() OR is_service_role()) WITH CHECK (is_admin() OR is_service_role());

DROP POLICY IF EXISTS "Allow authenticated users to delete event_target_audiences" ON public.event_target_audiences;
CREATE POLICY "admin_service_delete_event_target_audiences" ON public.event_target_audiences FOR DELETE USING (is_admin() OR is_service_role());

-- public.prerequisites
DROP POLICY IF EXISTS "Allow authenticated users to insert prerequisites" ON public.prerequisites;
CREATE POLICY "admin_service_insert_prerequisites" ON public.prerequisites FOR INSERT WITH CHECK (is_admin() OR is_service_role());

DROP POLICY IF EXISTS "Allow authenticated users to update prerequisites" ON public.prerequisites;
CREATE POLICY "admin_service_update_prerequisites" ON public.prerequisites FOR UPDATE USING (is_admin() OR is_service_role()) WITH CHECK (is_admin() OR is_service_role());

DROP POLICY IF EXISTS "Allow authenticated users to delete prerequisites" ON public.prerequisites;
CREATE POLICY "admin_service_delete_prerequisites" ON public.prerequisites FOR DELETE USING (is_admin() OR is_service_role());

-- public.target_audiences
DROP POLICY IF EXISTS "Allow authenticated users to insert target_audiences" ON public.target_audiences;
CREATE POLICY "admin_service_insert_target_audiences" ON public.target_audiences FOR INSERT WITH CHECK (is_admin() OR is_service_role());

DROP POLICY IF EXISTS "Allow authenticated users to update target_audiences" ON public.target_audiences;
CREATE POLICY "admin_service_update_target_audiences" ON public.target_audiences FOR UPDATE USING (is_admin() OR is_service_role()) WITH CHECK (is_admin() OR is_service_role());

DROP POLICY IF EXISTS "Allow authenticated users to delete target_audiences" ON public.target_audiences;
CREATE POLICY "admin_service_delete_target_audiences" ON public.target_audiences FOR DELETE USING (is_admin() OR is_service_role());;
