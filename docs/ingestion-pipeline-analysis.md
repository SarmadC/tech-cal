# Ingestion Pipeline Analysis

## 1. Current State

### 1.1 Collection Layer
- `IngestionOrchestrator.runAllActiveSources` processes sources sequentially, enforcing per-source intervals but limiting throughput when dozens of feeds are active. The orchestrator also inserts staging rows one-by-one, leading to many small writes.

```1:190:src/services/ingestion/IngestionOrchestrator.ts
await supabaseClient
    .from('ingestion_jobs')
    .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        events_fetched: eventsFetched,
        events_normalized: recordsQueued,
        errors_count: errors,
    })
    .eq('id', jobId);
```

- Collectors reuse the same `BaseCollector` validation pipeline, but HTML/RSS collectors lack per-domain rate limiting beyond the orchestrator delay, exposing us to throttling.
- Provenance hashes are precomputed inside collectors and persisted directly, which is good for dedupe consistency.

### 1.2 Normalization Layer
- `NormalizationProcessor.processPendingEvents` attempts to claim rows via the `claim_pending_source_events` RPC, falling back to a less-safe client-side loop if the function is missing.

```214:273:src/services/ingestion/NormalizationProcessor.ts
const { data: sourceEvents, error: fetchError } = await supabaseClient
    .rpc('claim_pending_source_events', {
        p_limit: limit,
        p_processing_status: 'processing',
    });
```

- Each claimed event is filtered, deduped, normalized, scored, and potentially queued for moderation serially. This maximizes correctness but adds ~8–10 round trips per event (filters, dedupe queries, organizer lookups, quality score writes, normalization upsert, Firecrawl enqueue).
- Deduplication follows a clear fallback path (checksum → canonical URL → fuzzy → series), but fuzzy matching pulls batches into memory and executes client-side Levenshtein when the RPC is missing, making it CPU-heavy.

### 1.3 Quality Scoring & Moderation
- Quality scoring blends four components with configurable weights and toggles speaker verification. Allowlisted sources benefit from lower thresholds; others auto-publish at ≥75%.

```35:123:src/services/ingestion/QualityScoringService.ts
const shouldAutoPublish = this.shouldAutoPublish(overall, isAllowlisted);
const requiresModeration = this.requiresModeration(overall, isAllowlisted);
return {
    overall,
    components: { sourceTrust, metadataCompleteness, speakerVerification, historicalPerformance },
    confidence,
    shouldAutoPublish,
    requiresModeration,
    reasonCodes,
};
```

- Speaker verification performs live HEAD requests per speaker (up to N), which can stall normalization if many events contain large speaker rosters.

### 1.4 Enrichment & Firecrawl
- Enrichment enqueues after successful normalization. The worker polls `events` with `firecrawl_enrichment_status='pending'`, then runs Firecrawl extract jobs, merging structured data into events (description, schedule, pricing, venue, etc.), and updates metadata with retry/backoff info.

```312:353:src/services/ingestion/FirecrawlEnrichmentService.ts
await this.updateEnrichmentStatus(
    eventId,
    'pending',
    {
        attempted_at: new Date().toISOString(),
        retry_count: 0,
    },
    null,
    supabaseClient
);
```

- Credits/metrics are tracked via `extraction_job_log` and exposed through `IngestionMetricsService.getEnrichmentMetrics`.
- The worker processes batches sequentially (`Promise.allSettled` per chunk) without visibility into Firecrawl credit budgets; blocked domains cause per-event skips but still consume queue slots.

### 1.5 Data Flow & State
- Tables involved:
  - `ingestion_sources`: configuration + `last_fetched_at`
  - `ingestion_jobs`: per-run telemetry
  - `source_events`: staging queue with status machine (`pending`, `processing`, `normalized`, `filtered`, `duplicate`, `error`)
  - `events`: canonical records with provenance, quality score, enrichment metadata
  - `event_moderation_queue`: gating low-confidence events
- Status updates are explicit, but there is no dedicated dead-letter queue; retries stop after max attempts but records remain in `source_events` with `fetch_status='error'`.

### 1.6 Observability
- `IngestionMetricsService` aggregates jobs, source performance, quality distribution, moderation queue, and enrichment data, surfacing alerts for low success rates or stale sources.

```72:206:src/services/ingestion/IngestionMetricsService.ts
const successRate = totalJobs > 0 ? (successfulJobs / totalJobs) * 100 : 0;
const qualityDistribution = {
    high: qualityScoresList.filter(s => s >= 75).length,
    medium: qualityScoresList.filter(s => s >= 50 && s < 75).length,
    low: qualityScoresList.filter(s => s < 50).length,
};
```

- Docs (`docs/ingestion-observability.md`) provide SQL playbooks, but there is no automated dashboard export or alerting hook beyond manual `npm run analyze-ingestion`.

---

## 2. Enhancement Recommendations

| Priority | Area | Recommendation | Impact | Effort |
| --- | --- | --- | --- | --- |
| High | Collection | Parallelize `runAllActiveSources` with configurable concurrency + per-domain rate limits; use bulk `insert` for `source_events`. | +3–5× throughput, better SLA for hourly feeds. | Medium |
| High | Normalization | Replace RPC fallback with required migration; introduce worker pool (e.g., queue + concurrency) and batch writes (bulk updates, upserts). | Reduces race conditions and DB load. | Medium |
| High | Reliability | Introduce dead-letter table for `source_events` exceeding retries; add alerting via Supabase functions or Slack webhook. | Faster triage of stuck sources. | Low |
| Medium | Deduplication | Move fuzzy matching fully into Postgres (pg_trgm + materialized similarities) and cache organizer lookups. | Lower latency per event, fewer duplicates. | Medium |
| Medium | Quality | Cache speaker/headshot verification results per organizer domain; allow asynchronous verification to avoid blocking normalization. | Keeps pipeline fast while preserving scores. | Medium |
| Medium | Enrichment | Add credit budget guard + priority queue (e.g., `firecrawl_priority`) and track per-domain caps. | Prevents credit exhaustion, targets high-value events first. | Medium |
| Medium | Observability | Automate metrics export (Cron job → Supabase storage/BI) and wire alerts to Pager/Slack; add ingestion SLO dashboard. | Better visibility for regressions. | Low-Medium |
| Low | Data Flow | Add `source_events_history` or event-sourced audit to analyze filter/duplicate reasons longitudinally. | Richer analytics for tuning filters. | Medium |

---

## 3. Architecture Improvement Proposals

1. **Ingestion Orchestrator 2.0**
   - Convert orchestrator into a queue producer: fetch eligible sources, enqueue jobs into a durable queue (Supabase task table or external worker).
   - Worker pool pulls jobs, instantiates collectors, and bulk inserts into `source_events`.
   - Add per-source concurrency + jitter to avoid synchronized fetches.

2. **Normalization Worker Pool**
   - Replace tight loop with a job-based worker (e.g., `claim_pending_source_events` returning IDs only). Workers fetch batches, process in parallel, and perform batched updates (bulk `update`/`upsert` for normalization results, dedupe decisions, filter analytics).
   - Introduce caching layer (in-memory or Redis) for repeated lookups: `IngestionSourceService.getSourceById`, organizer IDs, allowlist/blocklist checks.

3. **Observability & Control Plane**
   - Build a consolidated metrics pipeline: nightly job runs `IngestionMetricsService`, stores snapshots in `ingestion_metrics_daily` for Grafana/Data Studio.
   - Add automated alerting via Supabase edge function triggered by cron results; send Slack webhook when success rate, queue depth, or Firecrawl failures breach thresholds.
   - Expose a “control plane” admin UI summarizing source health, dedupe stats, moderation backlog, and enrichment credits.

4. **Enrichment Budgeting**
   - Introduce an enrichment scheduler that prioritizes events based on persona coverage, missing metadata, and residual quality score impact.
   - Track Firecrawl credits per domain/day and block low-value runs automatically, falling back to rules-first extraction where possible.

5. **Data Quality Feedback Loop**
   - Persist filter/duplicate decisions into a warehouse-friendly table (`ingestion_event_audit`) with JSON metadata.
   - Use this dataset to retrain filter regexes and dedupe heuristics, closing the loop between moderation outcomes and upstream scoring.

---

## Next Steps
1. Confirm desired concurrency model (in-process worker vs. managed queue) and implement orchestrator parallelism.
2. Ship migration ensuring `claim_pending_source_events` RPC exists everywhere, then switch normalization to batched processing.
3. Implement dead-letter handling + alerting to surface failing sources/events within minutes.








