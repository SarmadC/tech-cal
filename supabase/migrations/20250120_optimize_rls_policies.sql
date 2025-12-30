    -- Optimize RLS policies for better performance
-- Replace auth.uid() with (select auth.uid()) to prevent re-evaluation per row
-- Consolidate multiple permissive policies where possible

-- calendar_connections: Fix auth.uid() calls and consolidate policies
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own calendar connections" ON public.calendar_connections;
DROP POLICY IF EXISTS "Users can create own calendar connections" ON public.calendar_connections;
DROP POLICY IF EXISTS "Users can insert own calendar connections" ON public.calendar_connections;
DROP POLICY IF EXISTS "Users can update own calendar connections" ON public.calendar_connections;
DROP POLICY IF EXISTS "Users can delete own calendar connections" ON public.calendar_connections;

-- Create optimized consolidated policies using (select auth.uid())
CREATE POLICY "Users can manage own calendar connections"
  ON public.calendar_connections
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- telemetry_events: Consolidate and optimize policies
-- Drop existing policies
DROP POLICY IF EXISTS "Service role can manage telemetry" ON public.telemetry_events;
DROP POLICY IF EXISTS "Service role can select telemetry" ON public.telemetry_events;
DROP POLICY IF EXISTS "Users insert their telemetry" ON public.telemetry_events;

-- Create optimized consolidated policies
-- Service role gets full access
CREATE POLICY "Service role can manage telemetry"
  ON public.telemetry_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can insert their own telemetry
-- Use (select auth.uid()) to avoid per-row evaluation
CREATE POLICY "Users insert their telemetry"
  ON public.telemetry_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (select auth.uid()) = user_id OR user_id IS NULL
  );

-- Authenticated users can select their own telemetry
CREATE POLICY "Users select their telemetry"
  ON public.telemetry_events
  FOR SELECT
  TO authenticated
  USING (
    (select auth.uid()) = user_id OR user_id IS NULL
  );

COMMENT ON POLICY "Users can manage own calendar connections" ON public.calendar_connections IS 
  'Optimized RLS policy using (select auth.uid()) to prevent per-row function evaluation';
COMMENT ON POLICY "Users insert their telemetry" ON public.telemetry_events IS 
  'Optimized RLS policy using (select auth.uid()) to prevent per-row function evaluation';
COMMENT ON POLICY "Users select their telemetry" ON public.telemetry_events IS 
  'Optimized RLS policy using (select auth.uid()) to prevent per-row function evaluation';

