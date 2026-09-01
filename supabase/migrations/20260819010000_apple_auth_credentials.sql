begin;

create table if not exists public.apple_auth_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  apple_subject text not null unique,
  client_id text not null,
  refresh_token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.apple_auth_credentials enable row level security;
revoke all on table public.apple_auth_credentials from public, anon, authenticated;
grant all on table public.apple_auth_credentials to service_role;

comment on table public.apple_auth_credentials is
  'Service-only encrypted Apple refresh tokens retained solely for account-deletion revocation.';

commit;
