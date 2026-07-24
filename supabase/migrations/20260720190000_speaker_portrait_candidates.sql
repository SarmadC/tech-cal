alter table public.speakers
  add column if not exists portrait_url text,
  add column if not exists portrait_width integer,
  add column if not exists portrait_height integer;

alter table public.speakers
  drop constraint if exists speakers_portrait_width_positive,
  add constraint speakers_portrait_width_positive
    check (portrait_width is null or portrait_width > 0),
  drop constraint if exists speakers_portrait_height_positive,
  add constraint speakers_portrait_height_positive
    check (portrait_height is null or portrait_height > 0),
  drop constraint if exists speakers_portrait_metadata_complete,
  add constraint speakers_portrait_metadata_complete
    check (
      (portrait_url is null and portrait_width is null and portrait_height is null)
      or
      (portrait_url is not null and portrait_width is not null and portrait_height is not null)
    );

comment on column public.speakers.photo_url is
  'Compact speaker avatar. It may be low-resolution or circular and must not be used as a large hero image.';

comment on column public.speakers.portrait_url is
  'Admin-approved, high-resolution speaker portrait for large hero surfaces.';

create table if not exists public.speaker_portrait_candidates (
  id uuid primary key default gen_random_uuid(),
  speaker_id uuid not null references public.speakers(id) on delete cascade,
  image_url text not null,
  source_page_url text not null,
  source_type text not null check (source_type in ('img', 'srcset', 'structured')),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (speaker_id, image_url)
);

create index if not exists speaker_portrait_candidates_speaker_status_idx
  on public.speaker_portrait_candidates (speaker_id, status, created_at desc);

alter table public.speaker_portrait_candidates enable row level security;

create policy "Admins manage speaker portrait candidates"
  on public.speaker_portrait_candidates
  for all
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.review_speaker_portrait_candidate(
  p_candidate_id uuid,
  p_action text,
  p_reviewer_id uuid,
  p_portrait_url text default null,
  p_portrait_width integer default null,
  p_portrait_height integer default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  candidate public.speaker_portrait_candidates%rowtype;
begin
  if p_action not in ('approve', 'reject') then
    raise exception 'invalid_portrait_review_action' using errcode = '22023';
  end if;

  select *
  into candidate
  from public.speaker_portrait_candidates
  where id = p_candidate_id
  for update;

  if not found then
    raise exception 'portrait_candidate_not_found' using errcode = 'P0002';
  end if;

  if candidate.status <> 'pending' then
    raise exception 'portrait_candidate_already_reviewed' using errcode = 'P0001';
  end if;

  if p_action = 'approve' then
    if
      p_portrait_url is null
      or p_portrait_width is null
      or p_portrait_height is null
      or least(p_portrait_width, p_portrait_height) < 1024
    then
      raise exception 'invalid_approved_portrait' using errcode = '22023';
    end if;

    update public.speakers
    set
      portrait_url = p_portrait_url,
      portrait_width = p_portrait_width,
      portrait_height = p_portrait_height
    where id = candidate.speaker_id;

    if not found then
      raise exception 'portrait_speaker_not_found' using errcode = 'P0002';
    end if;
  end if;

  update public.speaker_portrait_candidates
  set
    width = case when p_action = 'approve' then p_portrait_width else width end,
    height = case when p_action = 'approve' then p_portrait_height else height end,
    status = case when p_action = 'approve' then 'approved' else 'rejected' end,
    reviewed_by = p_reviewer_id,
    reviewed_at = now()
  where id = candidate.id;
end;
$$;

revoke all on function public.review_speaker_portrait_candidate(
  uuid,
  text,
  uuid,
  text,
  integer,
  integer
) from public, anon, authenticated;
grant execute on function public.review_speaker_portrait_candidate(
  uuid,
  text,
  uuid,
  text,
  integer,
  integer
) to service_role;
