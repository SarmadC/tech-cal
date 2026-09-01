
-- ============================================
-- MIGRATION 1: P0 — Fix RLS Policies & Trigger
-- ============================================

-- -----------------------------------------------
-- hackathon_teams: Replace open policies with scoped ones
-- -----------------------------------------------

-- Drop overly-permissive policies
DROP POLICY IF EXISTS "Allow authenticated users to insert hackathon_teams" ON public.hackathon_teams;
DROP POLICY IF EXISTS "Allow authenticated users to update hackathon_teams" ON public.hackathon_teams;
DROP POLICY IF EXISTS "Allow authenticated users to delete hackathon_teams" ON public.hackathon_teams;

-- INSERT: only the creator (created_by) can insert their own teams
CREATE POLICY "hackathon_teams_insert_own"
  ON public.hackathon_teams FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- UPDATE: only the team creator can update
CREATE POLICY "hackathon_teams_update_own"
  ON public.hackathon_teams FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- DELETE: only the team creator can delete
CREATE POLICY "hackathon_teams_delete_own"
  ON public.hackathon_teams FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- -----------------------------------------------
-- hackathon_participants: Replace open policies with scoped ones
-- -----------------------------------------------

-- Drop overly-permissive policies
DROP POLICY IF EXISTS "Allow authenticated users to insert hackathon_participants" ON public.hackathon_participants;
DROP POLICY IF EXISTS "Allow authenticated users to update hackathon_participants" ON public.hackathon_participants;
DROP POLICY IF EXISTS "Allow authenticated users to delete hackathon_participants" ON public.hackathon_participants;

-- INSERT: users can only register themselves
CREATE POLICY "hackathon_participants_insert_own"
  ON public.hackathon_participants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: users can only modify their own participation
CREATE POLICY "hackathon_participants_update_own"
  ON public.hackathon_participants FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: users can only remove their own participation
CREATE POLICY "hackathon_participants_delete_own"
  ON public.hackathon_participants FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- -----------------------------------------------
-- Extend check_team_capacity trigger to fire on UPDATE too
-- -----------------------------------------------

-- Drop the existing INSERT-only trigger
DROP TRIGGER IF EXISTS enforce_team_capacity ON public.hackathon_participants;

-- Recreate to fire on both INSERT and UPDATE OF team_id
CREATE TRIGGER enforce_team_capacity
  BEFORE INSERT OR UPDATE OF team_id
  ON public.hackathon_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.check_team_capacity();
;
