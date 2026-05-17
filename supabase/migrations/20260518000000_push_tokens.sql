-- Push notification tokens for mobile clients (Expo Push Notification Service).
-- One row per device per user. `expo_push_token` is unique because a token may
-- be reassigned by APNs/FCM to a different user (e.g., account switch on the
-- same device) — we want the upsert to land on the existing row in that case.

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null unique,
  device_id text,
  platform text not null check (platform in ('ios', 'android')),
  app_version text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_tokens_user_id_idx on public.push_tokens (user_id);
create index if not exists push_tokens_user_device_idx
  on public.push_tokens (user_id, device_id);

alter table public.push_tokens enable row level security;

drop policy if exists push_tokens_select_own on public.push_tokens;
create policy push_tokens_select_own
  on public.push_tokens
  for select
  using (user_id = auth.uid());

drop policy if exists push_tokens_insert_own on public.push_tokens;
create policy push_tokens_insert_own
  on public.push_tokens
  for insert
  with check (user_id = auth.uid());

drop policy if exists push_tokens_update_own on public.push_tokens;
create policy push_tokens_update_own
  on public.push_tokens
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists push_tokens_delete_own on public.push_tokens;
create policy push_tokens_delete_own
  on public.push_tokens
  for delete
  using (user_id = auth.uid());
