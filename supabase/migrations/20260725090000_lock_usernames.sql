-- A public handle is a durable identity. Users may claim it once, but cannot
-- rename or clear it after that initial claim.
create table if not exists public.username_change_audit (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  previous_username text not null,
  next_username text not null,
  actor_id uuid references public.profiles(id) on delete set null,
  reason text not null check (char_length(btrim(reason)) between 1 and 1500),
  created_at timestamptz not null default now()
);

create index if not exists username_change_audit_profile_created_at_idx
  on public.username_change_audit(profile_id, created_at desc);

create or replace function public.prevent_username_change()
returns trigger
language plpgsql
as $$
begin
  if old.username is not null
     and new.username is distinct from old.username
     and current_setting('app.username_support_override', true) is distinct from 'on' then
    raise exception 'Usernames cannot be changed once claimed.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_username_change on public.profiles;
create trigger profiles_prevent_username_change
before update of username on public.profiles
for each row execute function public.prevent_username_change();

create or replace function public.support_override_username(
  p_profile_id uuid,
  p_next_username text,
  p_actor_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous_username text;
  v_next_username text := btrim(p_next_username);
begin
  if p_reason is null or char_length(btrim(p_reason)) = 0 then
    raise exception 'A support reason is required.';
  end if;

  select username into v_previous_username
  from public.profiles
  where id = p_profile_id
  for update;

  if v_previous_username is null then
    raise exception 'The profile has not claimed a username.';
  end if;

  if v_next_username !~ '^[A-Za-z][A-Za-z0-9_-]{2,29}$' then
    raise exception 'Invalid username format.';
  end if;

  if exists (
    select 1 from public.profiles
    where lower(username) = lower(v_next_username) and id <> p_profile_id
  ) then
    raise exception 'That username is already taken.' using errcode = '23505';
  end if;

  perform set_config('app.username_support_override', 'on', true);
  update public.profiles set username = v_next_username where id = p_profile_id;
  insert into public.username_change_audit(profile_id, previous_username, next_username, actor_id, reason)
  values (p_profile_id, v_previous_username, v_next_username, p_actor_id, btrim(p_reason));
end;
$$;

revoke all on function public.support_override_username(uuid, text, uuid, text) from public, anon, authenticated;
