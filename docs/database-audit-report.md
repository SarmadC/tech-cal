# Database Audit Report
Generated: 2025-01-XX

## Executive Summary

This comprehensive audit identified **60+ security issues**, **100+ performance issues**, and several data integrity concerns across the database. The most critical findings are:

- **12 tables without RLS enabled** (security vulnerability)
- **10 views using SECURITY DEFINER** (potential security risk)
- **13 unindexed foreign keys** (performance impact)
- **85+ unused indexes** (storage and write performance impact)
- **32 functions without search_path protection** (security vulnerability)

## Detailed Findings

### 1. Security Audit Results

#### Critical (ERROR level)

**RLS Disabled on Public Tables (12 tables)**
- `page_cache`, `extraction_job_log`, `ingestion_jobs`, `event_moderation_queue`
- `source_trust_scores`, `source_blocklist`, `source_allowlist`
- `ingestion_events_filters`, `event_field_protection_config`, `event_field_edits`
- `event_update_queue`, `event_update_queue_fields`, `event_update_log`

**Impact**: These tables are publicly accessible via PostgREST API without row-level security, potentially exposing sensitive data.

**Security Definer Views (10 views)**
- `telemetry_recommendation_batches_last7d`, `telemetry_skill_ratings_last7d`
- `event_speakers_flat`, `agenda_speakers_with_event`, `firecrawl_enrichment_stats`
- `firecrawl_retry_stats`, `firecrawl_strategy_comparison`, `event_speaker_list`
- `events_with_location`, `telemetry_recommendation_interactions_last7d`

**Impact**: Views execute with creator's privileges, potentially bypassing RLS policies intended for querying users.

#### Warnings (WARN level)

**Function Search Path Mutable (32 functions)**
Functions missing `SET search_path` protection, making them vulnerable to search_path injection attacks.

**Extension in Public Schema**
- `pg_trgm` extension installed in public schema (should be in extensions schema)

**Leaked Password Protection Disabled**
- HaveIBeenPwned integration not enabled in Auth settings

### 2. Performance Audit Results

#### Unindexed Foreign Keys (13 foreign keys)
Tables with foreign keys missing covering indexes:
- `agenda_speakers.event_id`
- `event_field_edits.edited_by`
- `event_field_protection_config.updated_by`
- `event_moderation_queue.event_id`, `event_moderation_queue.reviewer_id`
- `event_prerequisites.prerequisite_id`
- `event_target_audiences.audience_id`
- `event_update_queue.reviewed_by`
- `event_update_queue_fields.reviewed_by`
- `events.series_id`
- `ingestion_errors.source_event_id`
- `source_allowlist.allowed_by`
- `source_blocklist.blocked_by`

**Impact**: Foreign key checks and JOINs on these columns will be slower, especially as data grows.

#### Unused Indexes (85+ indexes)
Many indexes have never been used, consuming storage and slowing write operations. Examples:
- `telemetry_events_occurred_at_idx`, `telemetry_events_user_idx`
- `idx_events_registration_url`, `idx_events_enrichment_pending`
- And 80+ more...

**Impact**: 
- Wasted storage space
- Slower INSERT/UPDATE operations
- Increased backup sizes

#### RLS Initialization Plan Issues (7 policies)
Policies re-evaluating auth functions per row:
- `calendar_connections` table (5 policies)
- `telemetry_events` table (2 policies)

**Impact**: Suboptimal query performance at scale as auth functions are called for every row instead of once per query.

#### Multiple Permissive Policies (10+ instances)
Overlapping policies on:
- `telemetry_events` table (multiple roles, INSERT/SELECT actions)
- `calendar_connections` table (authenticated role, INSERT action)

**Impact**: Each policy must be evaluated for every relevant query, increasing overhead.

### 3. Data Integrity & Quality

#### Data Quality Metrics
- **Total Events**: 340
- **Events without organizer**: 1 (0.3%)
- **Events without location**: 0 (100% coverage ✓)
- **Events without type**: 0 (100% coverage ✓)
- **Orphaned foreign key records**: 0 (100% integrity ✓)

#### Table Size Analysis
- **Largest table**: `audit_log` (39 MB, 8,893 rows)
- **Second largest**: `source_events` (11 MB, 4,001 rows)
- **Third largest**: `events` (4.2 MB, 340 rows)

**Recommendation**: Implement archival strategy for `audit_log` to prevent unbounded growth.

### 4. Schema Health

- **Total views**: 16
- **Migrations tracked**: 2 (but extensive schema exists)
- **Recommendation**: Verify all schema changes are tracked in migrations

### 5. Extensions

**Installed Extensions**:
- Core: `pgcrypto`, `uuid-ossp`, `pg_stat_statements`, `pg_trgm`
- Advanced: `pg_graphql`, `supabase_vault`, `hypopg`, `index_advisor`

**Note**: `pg_trgm` should be moved from public schema to extensions schema.

### 6. Operational Health

- **Edge Functions**: 0 deployed
- **Active Ingestion Sources**: 10
- **Ingestion Jobs**: 53 tracked
- **Source Events**: 4,001
- **Moderation Queue**: 325 events pending review

## Remediation Priority

### Priority 1 (Critical - Immediate Action)
1. Enable RLS on all public tables without it
2. Add indexes to unindexed foreign keys used in frequent queries
3. Fix function search_path security issues

### Priority 2 (High - This Week)
4. Convert SECURITY DEFINER views to SECURITY INVOKER where appropriate
5. Fix RLS policy initialization plan issues
6. Consolidate multiple permissive policies

### Priority 3 (Medium - This Month)
7. Review and remove unused indexes
8. Move `pg_trgm` extension to extensions schema
9. Implement audit_log archival strategy
10. Enable leaked password protection in Auth

## Implementation Status

See migration files in `supabase/migrations/` for implementation details.

