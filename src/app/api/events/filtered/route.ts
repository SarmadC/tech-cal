import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { CareerProfileService } from '@/services/careerProfileService';
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';
import { FilteredEventsResponse, RecommendationTelemetryContext } from '@/types';
import { createHash, randomUUID } from 'crypto';
import { requireOnboardedApi } from '@/utils/onboarding';
import { logger } from '@/utils/logger';
import {
  buildUserLocationFromProfileContext,
  FilteredEventsRequest,
  loadFilteredEventsData,
  normalizeFilteredEventsRequest,
} from '@/services/filteredEventsService';
import {
  buildCareerProfileFingerprint,
  buildLocationFingerprint,
} from '@/services/recommendations/recommendationFingerprint';

// Rate limiter for filtered events API
const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(30, '1 m'), // 30 requests per minute per user
  analytics: true,
  prefix: 'events-filtered',
});

/**
 * POST /api/events/filtered
 * Server-side event filtering with pagination and statistics
 * // Force Rebuild 1
 */
export async function POST(request: NextRequest) {
  const requestTimestamp = request.headers.get('X-Request-Timestamp');
  const requestId = request.headers.get('X-Request-Id') || randomUUID();
  
  logger.debug('[API] Starting filtered events request', {
    requestId,
    requestTimestamp: requestTimestamp || 'not provided',
    serverTime: new Date().toISOString()
  });
  
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      logger.debug('[API] Authentication failed:', authError);
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    logger.debug('[API] User authenticated:', user.id);

    // Optional onboarding requirement for filtered events
    const onboardingGuard = await requireOnboardedApi(supabase, user.id);
    if (onboardingGuard) {
      return onboardingGuard;
    }

    // Apply rate limiting (skip in development if KV not configured)
    try {
      const { success: rateLimitSuccess } = await ratelimit.limit(user.id);
      if (!rateLimitSuccess) {
        logger.debug('[API] Rate limit exceeded for user:', user.id);
        return NextResponse.json(
          { success: false, error: 'Too many requests. Please try again later.' },
          { status: 429 }
        );
      }
    } catch (rateLimitError) {
      // Skip rate limiting if KV is not configured (development mode)
      const errorMessage = rateLimitError instanceof Error ? rateLimitError.message : 'Unknown rate limit error';
      logger.debug('[API] Rate limiting skipped (KV not configured):', errorMessage);
    }

    // Parse and validate request
    const rawBody: FilteredEventsRequest = await request.json();
    const normalizedRequest = normalizeFilteredEventsRequest(rawBody);
    
    // Validate pagination parameters
    if (normalizedRequest.page < 1 || normalizedRequest.pageSize < 1 || normalizedRequest.pageSize > 100) {
      return NextResponse.json(
        { success: false, error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('analytics_consent, preferences, timezone, location')
      .eq('id', user.id)
      .single();

    const hasTelemetryConsent = Boolean(profileRow?.analytics_consent);

    // Get user's career profile for scoring and cache-key personalization
    let careerProfile = null;
    try {
      careerProfile = await CareerProfileService.getCareerProfile(user.id, supabase);
    } catch (error) {
      logger.debug('No career profile found for user, skipping career impact scoring:', error);
    }

    // Extract user location for location-aware scoring and cache segmentation
    const userLocation = buildUserLocationFromProfileContext(profileRow, request.headers.get('x-timezone'));

    // Build a stable cache signature (per-user + filters)
    const normalizedSignature = {
      userId: user.id,
      profileFingerprint: buildCareerProfileFingerprint(careerProfile),
      locationFingerprint: buildLocationFingerprint(userLocation),
      searchTerm: normalizedRequest.searchTerm,
      categories: normalizedRequest.categories.slice().sort(),
      tags: normalizedRequest.tags.slice().sort(),
      locations: normalizedRequest.locations.slice().sort(),
      format: normalizedRequest.format,
      budget: normalizedRequest.budget,
      cost: normalizedRequest.cost,
      difficulty: normalizedRequest.difficulty,
      dateStart: normalizedRequest.dateRange?.start || null,
      dateEnd: normalizedRequest.dateRange?.end || null,
      sortBy: normalizedRequest.sortBy,
      sortDirection: normalizedRequest.sortDirection,
      page: normalizedRequest.page,
      pageSize: normalizedRequest.pageSize,
      availability: normalizedRequest.availability,
      popularity: normalizedRequest.popularity,
      duration: normalizedRequest.duration,
      myTracked: normalizedRequest.myTracked,
      myNetwork: normalizedRequest.myNetwork,
      recommended: normalizedRequest.recommended,
      surface: normalizedRequest.surface,
      fastSearch: normalizedRequest.fastSearch,
    };

    const cacheKey = `fe4:${createHash('sha1').update(JSON.stringify(normalizedSignature)).digest('hex')}`;

    // Attempt to serve from cache for a short TTL window
    try {
      const cached = await kv.get<FilteredEventsResponse>(cacheKey);
      if (cached) {
        // Attach quick headers and return cached response
        const res = NextResponse.json(cached);
        res.headers.set('X-Cache', 'HIT');
        res.headers.set('X-Cache-Key', cacheKey);
        return res;
      }
    } catch (cacheErr) {
      logger.debug('[API] Filtered events cache unavailable/disabled:', cacheErr instanceof Error ? cacheErr.message : 'unknown');
    }

    const telemetryContext: RecommendationTelemetryContext | undefined = hasTelemetryConsent ? {
      userId: user.id,
      hasConsent: true,
      sessionId: normalizedRequest.sessionId ?? null,
      requestId,
      source: 'backend',
      surface: 'filtered_events',
      additionalContext: {
        recommended: normalizedRequest.recommended,
        hasSearchTerm: Boolean(normalizedRequest.rawSearchTerm),
        categoryCount: normalizedRequest.categories.length,
        ...(normalizedRequest.format !== 'all' ? { format: normalizedRequest.format } : {}),
        page: normalizedRequest.page,
      }
    } : undefined;
    const data = await loadFilteredEventsData({
      request: normalizedRequest,
      supabase,
      userId: user.id,
      careerProfile,
      userLocation,
      telemetry: telemetryContext,
      requestId,
      skipColdStart: normalizedRequest.surface === 'calendar',
    });

    const response: FilteredEventsResponse = { success: true, data };

    // OPTIMIZATION: Store in cache with longer TTL for better performance
    // For common searches (just search term, no other filters), use longer TTL (5 minutes)
    // For other searches, use shorter TTL (2 minutes)
    const hasOnlySearchTerm = Boolean(normalizedRequest.rawSearchTerm)
      && normalizedRequest.categories.length === 0
      && normalizedRequest.tags.length === 0
      && normalizedRequest.locations.length === 0
      && normalizedRequest.format === 'all'
      && normalizedRequest.budget === 'all'
      && normalizedRequest.cost === 'all'
      && normalizedRequest.difficulty === 'all'
      && !normalizedRequest.dateRange?.start
      && !normalizedRequest.dateRange?.end
      && normalizedRequest.popularity === 'all'
      && normalizedRequest.duration === 'all'
      && !normalizedRequest.myNetwork
      && !normalizedRequest.recommended
      && normalizedRequest.sortBy !== 'career-impact';
    const cacheTTL = hasOnlySearchTerm ? 300 : 120;
    
    try {
      await kv.set(cacheKey, response, { ex: cacheTTL });
    } catch (cacheSetErr) {
      logger.debug('[API] Failed to set filtered events cache:', cacheSetErr instanceof Error ? cacheSetErr.message : 'unknown');
    }

    const res = NextResponse.json(response);
    res.headers.set('X-Cache', 'MISS');
    res.headers.set('X-Cache-Key', cacheKey);
    return res;

  } catch (error) {
    console.error('[API] Filtered events API error:', error);
    console.error('[API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
