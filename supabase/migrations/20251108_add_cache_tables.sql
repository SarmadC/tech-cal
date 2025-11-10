-- Page cache to store normalized HTML fetches and parsed output for enrichment reuse
create table if not exists public.page_cache (
    id uuid primary key default gen_random_uuid(),
    normalized_url text not null,
    source_domain text not null,
    status_code integer,
    etag text,
    last_modified text,
    content_hash text not null,
    raw_html text,
    extracted jsonb,
    fetch_metadata jsonb,
    fetched_at timestamptz not null default now(),
    expires_at timestamptz,
    last_seen_at timestamptz not null default now(),
    constraint page_cache_normalized_url_key unique (normalized_url)
);

create index if not exists idx_page_cache_content_hash
    on public.page_cache (content_hash);

create index if not exists idx_page_cache_expires_at
    on public.page_cache (expires_at);

-- Extraction job log for auditing credit usage and enrichment decisions
create table if not exists public.extraction_job_log (
    id uuid primary key default gen_random_uuid(),
    event_id uuid references public.events (id) on delete set null,
    source_url text not null,
    normalized_url text not null,
    source_domain text,
    adapter text,
    parser_version text,
    firecrawl_used boolean not null default false,
    firecrawl_credits_spent numeric,
    confidence numeric,
    decision text,
    status text not null default 'pending',
    error jsonb,
    cache_hit boolean,
    fetched_from_cache boolean,
    started_at timestamptz not null default now(),
    completed_at timestamptz,
    duration_ms integer,
    metadata jsonb,
    constraint extraction_job_log_event_source_unique unique (event_id, normalized_url)
);

create index if not exists idx_extraction_job_log_source_url
    on public.extraction_job_log (normalized_url);

create index if not exists idx_extraction_job_log_source_domain
    on public.extraction_job_log (source_domain);

create index if not exists idx_extraction_job_log_started_at
    on public.extraction_job_log (started_at);



