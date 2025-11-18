-- Ensure the claim_pending_source_events function is tracked via migrations
create or replace function public.claim_pending_source_events(
    p_limit integer default 100,
    p_processing_status text default 'processing'
)
returns table (
    id uuid,
    source_id uuid,
    fetch_job_id uuid,
    raw_payload jsonb,
    checksum text,
    fetch_status text,
    normalized_event_id uuid,
    error_message text,
    created_at timestamptz,
    updated_at timestamptz
)
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $function$
begin
    -- Atomically claim pending source_events rows by switching them to the provided status.
    return query
        with claimed_ids as (
            select se.id
            from public.source_events se
            where se.fetch_status = 'pending'
            order by se.created_at asc
            limit p_limit
            for update skip locked
        )
        update public.source_events se
        set
            fetch_status = p_processing_status,
            updated_at = now()
        from claimed_ids
        where se.id = claimed_ids.id
        returning
            se.id,
            se.source_id,
            se.fetch_job_id,
            se.raw_payload,
            se.checksum,
            se.fetch_status,
            se.normalized_event_id,
            se.error_message,
            se.created_at,
            se.updated_at;
end;
$function$;

comment on function public.claim_pending_source_events(integer, text)
    is 'Claims pending rows from source_events using row-level locking to avoid double-processing.';


