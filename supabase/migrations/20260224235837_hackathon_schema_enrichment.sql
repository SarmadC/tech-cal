
-- ============================================
-- MIGRATION 3: P2/P3 — Schema Enrichment
-- ============================================

-- -----------------------------------------------
-- Add event_id FK for calendar linking
-- -----------------------------------------------
ALTER TABLE public.hackathons
  ADD COLUMN event_id uuid REFERENCES public.events(id) ON DELETE SET NULL;

CREATE INDEX idx_hackathons_event ON public.hackathons USING btree (event_id) WHERE event_id IS NOT NULL;

-- -----------------------------------------------
-- Add structured location fields
-- -----------------------------------------------
ALTER TABLE public.hackathons
  ADD COLUMN location_city varchar,
  ADD COLUMN location_country varchar,
  ADD COLUMN location_latitude numeric,
  ADD COLUMN location_longitude numeric;

-- -----------------------------------------------
-- Add prize fields
-- -----------------------------------------------
ALTER TABLE public.hackathons
  ADD COLUMN prize_pool text,
  ADD COLUMN prize_description text;

-- -----------------------------------------------
-- Create hackathon_tags junction table
-- -----------------------------------------------
CREATE TABLE public.hackathon_tags (
  hackathon_id uuid NOT NULL REFERENCES public.hackathons(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.event_tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (hackathon_id, tag_id)
);

-- Enable RLS
ALTER TABLE public.hackathon_tags ENABLE ROW LEVEL SECURITY;

-- Policies: public read, admin/system write
CREATE POLICY "hackathon_tags_select_all"
  ON public.hackathon_tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "hackathon_tags_insert_authenticated"
  ON public.hackathon_tags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.hackathon_teams ht
      JOIN public.hackathons h ON h.id = ht.hackathon_id
      WHERE h.id = hackathon_id AND ht.created_by = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

CREATE POLICY "hackathon_tags_delete_admin"
  ON public.hackathon_tags FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

-- Indexes
CREATE INDEX idx_hackathon_tags_hackathon ON public.hackathon_tags USING btree (hackathon_id);
CREATE INDEX idx_hackathon_tags_tag ON public.hackathon_tags USING btree (tag_id);

-- -----------------------------------------------
-- Migrate FKs from auth.users to profiles
-- -----------------------------------------------

-- hackathon_teams.created_by: drop old FK, add new
ALTER TABLE public.hackathon_teams
  DROP CONSTRAINT IF EXISTS hackathon_teams_created_by_fkey;
ALTER TABLE public.hackathon_teams
  ADD CONSTRAINT hackathon_teams_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id);

-- hackathon_participants.user_id: drop old FK, add new
ALTER TABLE public.hackathon_participants
  DROP CONSTRAINT IF EXISTS hackathon_participants_user_id_fkey;
ALTER TABLE public.hackathon_participants
  ADD CONSTRAINT hackathon_participants_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id);
;
