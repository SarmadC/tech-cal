# Ingestion & Enrichment Observability Queries

Use the following SQL playbooks inside the Supabase SQL editor (or any Postgres client) to keep tabs on ingestion health and enrichment throughput.

## 1. Firecrawl Enrichment Backlog & Outcomes

```sql
-- Summary counts and median age per enrichment status (last 7 days)
WITH recent AS (
    SELECT
        id,
        firecrawl_enrichment_status AS status,
        firecrawl_enrichment_metadata,
        created_at,
        updated_at,
        NOW() - created_at AS age
    FROM public.events
    WHERE firecrawl_enrichment_status IS NOT NULL
      AND created_at >= NOW() - INTERVAL '7 days'
)
SELECT
    status,
    COUNT(*) AS events,
    ROUND(AVG(EXTRACT(EPOCH FROM age)) / 60)::INT AS avg_age_minutes,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM age)) / 60 AS median_age_minutes
FROM recent
GROUP BY status
ORDER BY status;
```

## 2. Pending vs Deferred (backoff) Snapshot

```sql
SELECT
    status,
    COUNT(*) AS events,
    SUM(
        (firecrawl_enrichment_metadata ->> 'next_retry_at')::timestamptz > NOW()
    ) AS deferred_count
FROM public.events
WHERE status = COALESCE(firecrawl_enrichment_status, 'pending')
GROUP BY status
ORDER BY status;
```

## 3. Top Filter Reasons (Last 14 Days)

```sql
SELECT
    filter_reason,
    filter_category,
    COUNT(*) AS occurrences,
    COUNT(DISTINCT source_id) AS sources_impacted
FROM public.ingestion_events_filters
WHERE filtered_at >= NOW() - INTERVAL '14 days'
GROUP BY filter_reason, filter_category
ORDER BY occurrences DESC
LIMIT 20;
```

## 4. Source-Level Queue Depth & Retry Heatmap

```sql
SELECT
    s.name AS source_name,
    COUNT(*) FILTER (WHERE e.firecrawl_enrichment_status = 'pending') AS pending,
    COUNT(*) FILTER (WHERE e.firecrawl_enrichment_status = 'in_progress') AS in_progress,
    COUNT(*) FILTER (WHERE e.firecrawl_enrichment_status = 'failed') AS failed,
    AVG(COALESCE((e.firecrawl_enrichment_metadata->>'retry_count')::INT, 0)) AS avg_retry_count
FROM public.events e
LEFT JOIN public.ingestion_sources s ON s.id = e.ingestion_source_id
WHERE e.firecrawl_enrichment_status IS NOT NULL
GROUP BY s.name
ORDER BY pending DESC NULLS LAST;
```

## 5. Queue Age Percentiles for Moderation

```sql
SELECT
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600) AS p50_hours,
    PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600) AS p90_hours,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600) AS p99_hours
FROM public.event_moderation_queue
WHERE status = 'pending';
```

## 6. Recently Queued vs Normalized Trendline

```sql
SELECT
    DATE(started_at) AS job_date,
    SUM(events_fetched) AS events_fetched,
    SUM(events_normalized) AS records_queued   -- now reflects staging queue size
FROM public.ingestion_jobs
WHERE started_at >= NOW() - INTERVAL '30 days'
GROUP BY job_date
ORDER BY job_date;
```

> Tip: Pin these queries in the Supabase dashboard or Grafana to create daily dashboards. Combine query #1 + #4 for proactive alerting (e.g., alert when pending > 200 or median age > 120 minutes).




