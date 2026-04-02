ALTER TABLE IF EXISTS public.user_submitted_events
ADD COLUMN IF NOT EXISTS source_url text;

ALTER TABLE IF EXISTS public.user_submitted_events
ADD COLUMN IF NOT EXISTS registration_mode text;

UPDATE public.user_submitted_events
SET registration_mode = CASE
    WHEN COALESCE(NULLIF(BTRIM(source_url), ''), NULLIF(BTRIM(registration_url), '')) IS NULL THEN 'native'
    ELSE 'external'
END
WHERE registration_mode IS NULL OR registration_mode NOT IN ('external', 'native');

ALTER TABLE IF EXISTS public.user_submitted_events
ALTER COLUMN registration_mode SET DEFAULT 'external';

UPDATE public.user_submitted_events
SET registration_mode = 'external'
WHERE registration_mode IS NULL;

ALTER TABLE IF EXISTS public.user_submitted_events
ALTER COLUMN registration_mode SET NOT NULL;

ALTER TABLE IF EXISTS public.user_submitted_events
DROP CONSTRAINT IF EXISTS user_submitted_events_registration_mode_check;

ALTER TABLE IF EXISTS public.user_submitted_events
ADD CONSTRAINT user_submitted_events_registration_mode_check
CHECK (registration_mode IN ('external', 'native'));

ALTER TABLE IF EXISTS public.events
ADD COLUMN IF NOT EXISTS registration_mode text;

UPDATE public.events
SET registration_mode = CASE
    WHEN BTRIM(COALESCE(ingestion_provenance::text, ''), '"') = 'user_submitted'
        AND COALESCE(NULLIF(BTRIM(source_url), ''), NULLIF(BTRIM(registration_url), '')) IS NULL THEN 'native'
    ELSE 'external'
END
WHERE registration_mode IS NULL OR registration_mode NOT IN ('external', 'native');

ALTER TABLE IF EXISTS public.events
ALTER COLUMN registration_mode SET DEFAULT 'external';

UPDATE public.events
SET registration_mode = 'external'
WHERE registration_mode IS NULL;

ALTER TABLE IF EXISTS public.events
ALTER COLUMN registration_mode SET NOT NULL;

ALTER TABLE IF EXISTS public.events
DROP CONSTRAINT IF EXISTS events_registration_mode_check;

ALTER TABLE IF EXISTS public.events
ADD CONSTRAINT events_registration_mode_check
CHECK (registration_mode IN ('external', 'native'));
