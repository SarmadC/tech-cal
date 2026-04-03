DO $$
BEGIN
    CREATE TYPE public.billing_provider AS ENUM ('paddle', 'revenuecat', 'manual');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

ALTER TABLE public.subscriptions
    ADD COLUMN IF NOT EXISTS billing_provider public.billing_provider,
    ADD COLUMN IF NOT EXISTS revenuecat_customer_id text,
    ADD COLUMN IF NOT EXISTS revenuecat_entitlement_id text,
    ADD COLUMN IF NOT EXISTS revenuecat_product_id text;

UPDATE public.subscriptions
SET billing_provider = 'paddle'
WHERE billing_provider IS NULL;

ALTER TABLE public.subscriptions
    ALTER COLUMN billing_provider SET DEFAULT 'paddle',
    ALTER COLUMN billing_provider SET NOT NULL;
