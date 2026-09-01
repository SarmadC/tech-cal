
-- ============================================
-- MIGRATION 2: P1 — Updated_at Triggers & min_team_size
-- ============================================

-- -----------------------------------------------
-- Attach handle_updated_at trigger to hackathon tables
-- -----------------------------------------------

-- hackathons
CREATE TRIGGER set_hackathons_updated_at
  BEFORE UPDATE ON public.hackathons
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- hackathon_teams
CREATE TRIGGER set_hackathon_teams_updated_at
  BEFORE UPDATE ON public.hackathon_teams
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- hackathon_participants
CREATE TRIGGER set_hackathon_participants_updated_at
  BEFORE UPDATE ON public.hackathon_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------
-- Add min_team_size with cross-column CHECK
-- -----------------------------------------------

ALTER TABLE public.hackathons
  ADD COLUMN min_team_size integer DEFAULT 1;

ALTER TABLE public.hackathons
  ADD CONSTRAINT hackathons_min_team_size_check
  CHECK (min_team_size > 0 AND min_team_size <= max_team_size);
;
