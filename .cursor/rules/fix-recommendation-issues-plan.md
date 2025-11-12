# Fix Additional Recommendation System Issues

## Critical Issues Identified

### 1. **Pagination Correctness with Career-Impact Sorting** (CRITICAL)
**Problem**: When sorting by `career-impact`, events are fetched in pages (sorted by date), then enriched and sorted in-memory. This means events on page 2+ might have higher career impact scores than events on page 1, but users will never see them.

**Impact**: Users miss the best recommendations - pagination is fundamentally broken for career-impact sorting.

**Solution**: For career-impact sorting, fetch a larger window (e.g., 5x pageSize), enrich all, sort, then return the requested page slice. This balances correctness with performance.

**Implementation**: Modify API route to detect career-impact sorting and fetch larger window, then paginate after enrichment and sorting.

### 2. **Recommended Filter Breaks on Later Pages**
**Problem**: The `recommended` filter checks `careerImpact.overall >= 50`, but if `page > ENRICH_MAX_PAGE`, events aren't enriched, so the filter silently fails.

**Impact**: Users filtering by "recommended" on later pages get incorrect results (all events pass the filter).

**Solution**: When `recommended` filter is active, always enrich events regardless of page number.

### 3. **Cold Start Detection Inconsistency**
**Problem**: Two different `isColdStartUser` functions with different logic:
- `profileTypeGuards.ts`: Checks if profile is empty (no skills/interests/goals)
- `behavioralBoostUtils.ts`: Checks if user has < 3 interactions in `user_events` table

**Impact**: Different parts of system classify same user differently, causing inconsistent behavior.

**Solution**: 
- Rename function in `profileTypeGuards.ts` to `isProfileEmpty` to clarify purpose
- Keep `isColdStartUser` in `behavioralBoostUtils.ts` for interaction-based check
- Update all usages to use appropriate function
- Document the distinction

### 4. **Default Sort Inconsistency**
**Problem**: 
- `useUnifiedServerFiltering` defaults to `sortBy: 'default'`
- API route defaults to `sortBy: 'date'`
- When `sortBy: 'default'` is passed, API treats it as 'date'

**Impact**: Confusing behavior when no sort is explicitly set.

**Solution**: Standardize on `'date'` as the default, map `'default'` to `'date'` explicitly in API route.

### 5. **Sort Direction Default Mismatch**
**Problem**: `useUnifiedServerFiltering` defaults to `sortDirection: 'asc'`, but career-impact sorting defaults to descending in the API route.

**Impact**: Inconsistent behavior when sortBy is 'career-impact' but sortDirection isn't explicitly set.

**Solution**: For career-impact sorting, default to 'desc' in the hook when sortBy is 'career-impact'.

## Implementation Plan

### Phase 1: Critical Fixes

1. **Fix pagination for career-impact sorting**
   - Modify API route to detect `sortBy === 'career-impact'`
   - Fetch larger window (5x pageSize) when career-impact sorting
   - Enrich all events in window
   - Sort by career impact
   - Return correct page slice
   - Update totalCount calculation to account for this

2. **Fix recommended filter on later pages**
   - Check if `recommended` filter is active
   - If active, always enrich regardless of ENRICH_MAX_PAGE
   - Apply recommended filter after enrichment

### Phase 2: Consistency Fixes

3. **Resolve cold start detection naming**
   - Rename `isColdStartUser` in `profileTypeGuards.ts` to `isProfileEmpty`
   - Update all usages in discovery views
   - Document the distinction between profile-based and interaction-based cold start

4. **Align default sort behavior**
   - Map `'default'` to `'date'` in API route
   - Update hook to use 'date' instead of 'default' if needed

5. **Fix sort direction defaults**
   - For career-impact sorting, default to 'desc' in hook when sortBy is 'career-impact'

## Files to Modify

- `src/app/api/events/filtered/route.ts` - Fix pagination and recommended filter
- `src/services/eventServices.ts` - May need helper for larger window fetching
- `src/utils/profileTypeGuards.ts` - Rename function and update exports
- `src/hooks/useUnifiedServerFiltering.ts` - Update defaults
- `src/components/calendar/desktop/discovery/DesktopDiscoveryView.tsx` - Update cold start detection
- `src/components/calendar/mobile/discovery/MobileDiscoveryView.tsx` - Update cold start detection
- `src/app/discover/DiscoverClientView.tsx` - Update cold start detection

## Testing Considerations

- Verify pagination correctness: events on page 2 should not have higher scores than page 1 when sorting by career-impact
- Test recommended filter on page 2+ to ensure it works
- Verify cold start detection is consistent across views
- Test default sort behavior matches expectations

