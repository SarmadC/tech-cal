create table if not exists public.user_submitted_events (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null,
    title text not null,
    description text,
    event_type text not null default 'other',
    start_date timestamptz not null,
    end_date timestamptz,
    location text,
    is_virtual boolean not null default false,
    registration_url text,
    organizer_name text,
    tags text[] not null default '{}'::text[],
    status text not null default 'pending',
    admin_notes text,
    reviewed_by uuid,
    reviewed_at timestamptz,
    event_id uuid,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    source_url text,
    registration_mode text not null default 'external',
    timezone text,
    event_format text,
    event_pattern text,
    is_multi_day boolean,
    location_city text,
    location_state text,
    location_country text,
    livestream_url text,
    event_image_url text,
    agenda_url text,
    pricing_type text,
    price_min numeric,
    price_max numeric,
    currency text,
    registration_deadline timestamptz,
    difficulty_level text,
    language text,
    capacity integer,
    attendee_count integer,
    certificate_offered boolean,
    recording_available boolean,
    social_media_hashtag text,
    virtual_platform text,
    target_audience text,
    prerequisites text,
    accessibility_features jsonb,
    speaker_lineup jsonb,
    organizer_details jsonb,
    series_details jsonb,
    submitted_payload jsonb,
    approved_payload jsonb,
    submission_fingerprint text,
    risk_flags text[],
    validation_summary jsonb
);

alter table public.user_submitted_events
    add column if not exists updated_at timestamptz default now(),
    add column if not exists source_url text,
    add column if not exists registration_mode text default 'external',
    add column if not exists timezone text,
    add column if not exists event_format text,
    add column if not exists event_pattern text,
    add column if not exists is_multi_day boolean,
    add column if not exists location_city text,
    add column if not exists location_state text,
    add column if not exists location_country text,
    add column if not exists livestream_url text,
    add column if not exists event_image_url text,
    add column if not exists agenda_url text,
    add column if not exists pricing_type text,
    add column if not exists price_min numeric,
    add column if not exists price_max numeric,
    add column if not exists currency text,
    add column if not exists registration_deadline timestamptz,
    add column if not exists difficulty_level text,
    add column if not exists language text,
    add column if not exists capacity integer,
    add column if not exists attendee_count integer,
    add column if not exists certificate_offered boolean,
    add column if not exists recording_available boolean,
    add column if not exists social_media_hashtag text,
    add column if not exists virtual_platform text,
    add column if not exists target_audience text,
    add column if not exists prerequisites text,
    add column if not exists accessibility_features jsonb,
    add column if not exists speaker_lineup jsonb,
    add column if not exists organizer_details jsonb,
    add column if not exists series_details jsonb,
    add column if not exists submitted_payload jsonb,
    add column if not exists approved_payload jsonb,
    add column if not exists submission_fingerprint text,
    add column if not exists risk_flags text[],
    add column if not exists validation_summary jsonb;

update public.user_submitted_events
set
    event_type = coalesce(event_type, 'other'),
    is_virtual = coalesce(is_virtual, false),
    tags = coalesce(tags, '{}'::text[]),
    status = coalesce(status, 'pending'),
    created_at = coalesce(created_at, now()),
    updated_at = coalesce(updated_at, now()),
    registration_mode = coalesce(registration_mode, 'external');

alter table public.user_submitted_events
    alter column event_type set default 'other',
    alter column event_type set not null,
    alter column is_virtual set default false,
    alter column is_virtual set not null,
    alter column tags set default '{}'::text[],
    alter column tags set not null,
    alter column status set default 'pending',
    alter column status set not null,
    alter column created_at set default now(),
    alter column created_at set not null,
    alter column updated_at set default now(),
    alter column updated_at set not null,
    alter column registration_mode set default 'external',
    alter column registration_mode set not null;

alter table public.user_submitted_events
    drop constraint if exists user_submitted_events_user_id_fkey,
    drop constraint if exists user_submitted_events_reviewed_by_fkey,
    drop constraint if exists user_submitted_events_event_id_fkey,
    drop constraint if exists user_submitted_events_difficulty_level_check,
    drop constraint if exists user_submitted_events_event_format_check,
    drop constraint if exists user_submitted_events_event_pattern_check,
    drop constraint if exists user_submitted_events_event_type_check,
    drop constraint if exists user_submitted_events_pricing_type_check,
    drop constraint if exists user_submitted_events_registration_mode_check,
    drop constraint if exists user_submitted_events_review_state_check,
    drop constraint if exists user_submitted_events_status_check;

alter table public.user_submitted_events
    add constraint user_submitted_events_user_id_fkey
        foreign key (user_id) references auth.users (id) on delete cascade,
    add constraint user_submitted_events_reviewed_by_fkey
        foreign key (reviewed_by) references auth.users (id),
    add constraint user_submitted_events_event_id_fkey
        foreign key (event_id) references public.events (id) on delete set null,
    add constraint user_submitted_events_difficulty_level_check
        check (difficulty_level is null or difficulty_level = any (array['beginner', 'intermediate', 'advanced']::text[])),
    add constraint user_submitted_events_event_format_check
        check (event_format is null or event_format = any (array['Online', 'In-person', 'Hybrid']::text[])),
    add constraint user_submitted_events_event_pattern_check
        check (event_pattern is null or event_pattern = any (array['single', 'multi_day', 'all_day', 'custom']::text[])),
    add constraint user_submitted_events_event_type_check
        check (event_type = any (array['tech_event', 'hackathon', 'meetup', 'conference', 'workshop', 'other']::text[])),
    add constraint user_submitted_events_pricing_type_check
        check (pricing_type is null or pricing_type = any (array['Free', 'Paid', 'Varies']::text[])),
    add constraint user_submitted_events_registration_mode_check
        check (registration_mode = any (array['external', 'native']::text[])),
    add constraint user_submitted_events_review_state_check
        check (
            (
                status = 'pending'
                and reviewed_by is null
                and reviewed_at is null
                and event_id is null
            )
            or (
                status = 'approved'
                and reviewed_by is not null
                and reviewed_at is not null
                and event_id is not null
            )
            or (
                status = 'declined'
                and reviewed_by is not null
                and reviewed_at is not null
                and event_id is null
            )
        ),
    add constraint user_submitted_events_status_check
        check (status = any (array['pending', 'approved', 'declined']::text[]));

create or replace function public.update_user_submitted_events_updated_at()
returns trigger
language plpgsql
as $function$
begin
    new.updated_at = now();
    return new;
end;
$function$;

drop trigger if exists trg_user_submitted_events_updated_at on public.user_submitted_events;

create trigger trg_user_submitted_events_updated_at
    before update on public.user_submitted_events
    for each row
    execute function public.update_user_submitted_events_updated_at();

alter table public.user_submitted_events enable row level security;

drop policy if exists user_submitted_events_insert_own on public.user_submitted_events;
drop policy if exists user_submitted_events_select_own on public.user_submitted_events;
drop policy if exists users_insert_own_submissions on public.user_submitted_events;
drop policy if exists users_read_own_submissions on public.user_submitted_events;

create policy users_insert_own_submissions
    on public.user_submitted_events
    for insert
    to authenticated
    with check (auth.uid() = user_id);

create policy users_read_own_submissions
    on public.user_submitted_events
    for select
    to authenticated
    using (auth.uid() = user_id);

drop index if exists public.user_submitted_events_user_id_idx;
drop index if exists public.user_submitted_events_status_idx;
drop index if exists public.user_submitted_events_event_id_idx;
drop index if exists public.idx_user_submitted_events_status;
drop index if exists public.idx_user_submitted_events_user_id;
drop index if exists public.idx_user_submitted_events_status_created_at;
drop index if exists public.idx_user_submitted_events_submission_fingerprint;

create index if not exists idx_user_submitted_events_user_id
    on public.user_submitted_events (user_id);

create index if not exists idx_user_submitted_events_status_created_at
    on public.user_submitted_events (status, created_at desc);

create index if not exists idx_user_submitted_events_submission_fingerprint
    on public.user_submitted_events (submission_fingerprint);
