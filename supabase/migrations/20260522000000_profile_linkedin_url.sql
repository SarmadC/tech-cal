-- Optional LinkedIn URL on a user's profile. Powers the "Send intro"
-- CTA on the public profile screen: deep-links to the stored URL when set,
-- otherwise falls back to a LinkedIn name search on the client.
alter table public.profiles add column linkedin_url text;
