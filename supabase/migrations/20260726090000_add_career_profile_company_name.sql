alter table public.career_profiles
  add column if not exists company_name text;

alter table public.career_profiles
  add constraint career_profiles_company_name_length
  check (company_name is null or char_length(btrim(company_name)) between 1 and 120);
