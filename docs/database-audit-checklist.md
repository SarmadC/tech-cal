# Database Audit Implementation Checklist

## Completed Items ✓

### Security Fixes
- [x] Created migration to enable RLS on 12 public tables
- [x] Created migration to fix function search_path security (30+ functions)
- [x] Created migration to convert SECURITY DEFINER views to SECURITY INVOKER
- [x] Created migration to optimize RLS policies (use (select auth.uid()))

### Performance Fixes
- [x] Created migration to add indexes to 13 unindexed foreign keys

### Documentation
- [x] Created comprehensive audit report (`database-audit-report.md`)
- [x] Created implementation summary (`database-audit-implementation-summary.md`)
- [x] Created this checklist

## Pending Items (Require Manual Review/Action)

### Security
- [ ] Move `pg_trgm` extension from public schema to extensions schema
  - **Action**: Create migration or manual change via Supabase dashboard
  - **Impact**: Better schema organization

- [ ] Enable leaked password protection in Auth settings
  - **Action**: Supabase Dashboard → Authentication → Password Security → Enable HaveIBeenPwned
  - **Impact**: Enhanced security for user accounts

### Performance
- [ ] Review and remove unused indexes (85+ indexes)
  - **Action**: Analyze `pg_stat_user_indexes` to identify truly unused indexes
  - **Create migration** to drop indexes after confirming they're unused
  - **Impact**: Reduced storage, faster writes

### Data Management
- [ ] Implement audit_log archival strategy
  - **Action**: Create process to archive old audit_log entries (> 1 year)
  - **Current size**: 39 MB, 8,893 rows
  - **Impact**: Prevent unbounded table growth

### Schema Management
- [ ] Review schema migration tracking
  - **Action**: Verify all schema changes are tracked in migrations
  - **Current**: Only 2 migrations tracked but extensive schema exists
  - **Impact**: Better versioning and deployment process

## Migration Deployment Checklist

Before deploying migrations:

1. [ ] Review all migration files for correctness
2. [ ] Test migrations in development/staging environment
3. [ ] Backup production database
4. [ ] Schedule maintenance window if needed
5. [ ] Notify team of deployment

### Deployment Order
1. [ ] Deploy `20250120_enable_rls_on_public_tables.sql`
2. [ ] Deploy `20250120_add_missing_foreign_key_indexes.sql`
3. [ ] Deploy `20250120_optimize_rls_policies.sql`
4. [ ] Deploy `20250120_fix_function_search_path_security.sql`
5. [ ] Deploy `20250120_convert_security_definer_views.sql`

### Post-Deployment Verification
1. [ ] Verify RLS policies are working correctly
2. [ ] Test application functionality (no broken queries)
3. [ ] Monitor query performance metrics
4. [ ] Check for errors in application logs
5. [ ] Verify indexes are being used (`pg_stat_user_indexes`)
6. [ ] Monitor RLS policy execution (check for performance improvements)

## SQL Queries for Verification

### Check RLS Status
```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

### Check Index Usage
```sql
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC, tablename;
```

### Check Function Search Path
```sql
SELECT p.proname, p.proconfig
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND (p.proconfig IS NULL OR 'search_path' != ALL(p.proconfig::text[]))
ORDER BY p.proname;
```

### Check View Security
```sql
SELECT schemaname, viewname, viewowner, definition
FROM pg_views
WHERE schemaname = 'public'
ORDER BY viewname;
```

### Check Foreign Key Indexes
```sql
SELECT
    tc.table_name,
    kcu.column_name,
    COUNT(ix.indexname) as index_count
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN pg_indexes ix
    ON ix.tablename = tc.table_name 
    AND ix.indexdef LIKE '%' || kcu.column_name || '%'
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
GROUP BY tc.table_name, kcu.column_name
HAVING COUNT(ix.indexname) = 0
ORDER BY tc.table_name, kcu.column_name;
```

## Notes

- All migrations are idempotent (use IF NOT EXISTS, CREATE OR REPLACE, etc.)
- Migrations can be rolled back if needed (see implementation summary)
- Performance improvements will be most noticeable on larger datasets
- Security improvements are critical and should be deployed as soon as possible

