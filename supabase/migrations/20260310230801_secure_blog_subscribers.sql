-- Remove overly permissive public insert policy
DROP POLICY IF EXISTS "subscribers_public_insert" ON public.blog_subscribers;

-- Add admin/service role insert policy
CREATE POLICY "admin_service_insert_blog_subscribers" ON public.blog_subscribers FOR INSERT WITH CHECK (is_admin() OR is_service_role());;
