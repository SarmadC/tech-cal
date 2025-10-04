# Production Verification Scripts

This directory contains scripts to verify that the enhanced recommendation system is production-ready.

## Quick Start

Run all verification checks:
```bash
npm run verify:all
```

Or run individual checks:
```bash
npm run verify:production    # Environment variables and basic functionality
npm run test:budget         # Budget filtering with real data
npm run validate:analytics  # Analytics data flow validation
```

## Scripts Overview

### 1. `verify-production.ts`
**Purpose**: Comprehensive production readiness check
**Checks**:
- ✅ Environment variables (required + optional)
- ✅ Database connection
- ✅ Budget filtering across all tiers
- ✅ Analytics data flow
- ✅ Scoring system functionality

**Usage**: `npm run verify:production`

### 2. `test-budget-filtering.ts`
**Purpose**: Test budget filtering with real database data
**Checks**:
- ✅ All budget tiers return events
- ✅ USD gating works correctly
- ✅ Free-only tier excludes paid events
- ✅ Currency distribution analysis

**Usage**: `npm run test:budget`

### 3. `validate-analytics.ts`
**Purpose**: Validate analytics data flow end-to-end
**Checks**:
- ✅ Environment configuration
- ✅ Consent management
- ✅ Interaction tracking (click/view)
- ✅ Career impact metrics
- ✅ Data retrieval functions

**Usage**: `npm run validate:analytics`

## Environment Variables

### Required
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SENTRY_DSN`

### Optional (Features)
- `NEXT_PUBLIC_LOG_SCORING=true` - Enable scoring debug logs
- `NEXT_PUBLIC_TYPE_PREF_GATE=0.75` - Type preference gate strength
- `NEXT_PUBLIC_ENABLE_BEHAVIORAL_BOOST=true` - Enable behavioral boosts
- `NEXT_PUBLIC_ENABLE_SCORE_BREAKDOWN=true` - Enable debug score breakdown
- `NEXT_PUBLIC_SHOW_BUDGET_HINT=true` - Show budget filtering hint

## Expected Results

### ✅ Production Ready
All scripts should show:
- Environment variables: 3/3 required, 5+/13 optional
- Database connection: ✅
- Budget filtering: Events found across tiers
- Analytics: All tracking functions working
- Scoring: Algorithm loads and calculates scores

### ⚠️ Issues to Address
- Missing required environment variables
- Database connection failures
- No events found in budget filtering
- Analytics tracking errors

## Troubleshooting

### No Events Found
- Check if database has events with proper price/currency data
- Verify `filter_events` RPC function exists
- Check database indexes on price columns

### Analytics Errors
- Verify `user_interactions_simple` table exists
- Check `career_impact_analytics` table permissions
- Ensure RLS policies allow service role access

### Environment Issues
- Check `.env.local` file exists
- Verify all required variables are set
- Restart development server after env changes

## Production Deployment

Before deploying to production:

1. **Run all verification scripts**:
   ```bash
   npm run verify:all
   ```

2. **Set production environment variables**:
   - All required variables must be set
   - Optional features can be enabled as needed

3. **Verify database setup**:
   - All tables exist with proper indexes
   - RLS policies are configured
   - RPC functions are deployed

4. **Test with real data**:
   - Ensure events exist in database
   - Test budget filtering with actual events
   - Verify analytics data is being collected

## Monitoring

After deployment, monitor:
- Analytics data collection rates
- Budget filtering performance
- Scoring algorithm accuracy
- Error rates in logs

The verification scripts provide a solid foundation for ensuring your enhanced recommendation system is production-ready! 🚀
