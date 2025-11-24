import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { EventService } from '@/services/eventServices';
import { CareerProfileService } from '@/services/careerProfileService';
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';
import { EventFilters, RecommendationTelemetryContext } from '@/types';
import { createHash, randomUUID } from 'crypto';
import { requireOnboardedApi } from '@/utils/onboarding';

// Rate limiter for filtered events API
const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(30, '1 m'), // 30 requests per minute per user
  analytics: true,
  prefix: 'events-filtered',
});

interface FilteredEventsRequest {
  searchTerm?: string;
  categories?: string[];
  locations?: string[];
  format?: 'all' | 'virtual' | 'in-person' | 'hybrid';
  budget?: 'all' | 'free-only' | 'low' | 'moderate' | 'high' | 'unlimited';
  cost?: 'all' | 'free' | 'paid';
  difficulty?: 'all' | 'beginner' | 'intermediate' | 'advanced';
  dateRange?: {
    start?: string;
    end?: string;
  };
  sortBy?: 'default' | 'date' | 'popularity' | 'career-impact' | 'title' | 'location';
  sortDirection?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
  // Additional filters from useSmartFilters
  availability?: 'all' | 'available' | 'no-conflicts';
  popularity?: 'all' | 'trending' | 'high-attendance' | 'niche';
  duration?: 'all' | 'short' | 'medium' | 'long' | 'multi-day';
  myTracked?: boolean;
  myNetwork?: boolean;
  recommended?: boolean;
  sessionId?: string;
  surface?: 'calendar' | 'discover' | 'default';
}

interface FilteredEventsResponse {
  success: boolean;
  data?: {
    events: unknown[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      hasMore: boolean;
    };
    filters: {
      applied: Record<string, unknown>;
      available: {
        categories: Array<{ id: string; name: string; count: number }>;
        difficulties: Array<{ value: string; count: number }>;
        formats: Array<{ value: string; count: number }>;
        locations?: Array<{ value: string; count: number }>;
      };
    };
    stats: {
      processingTimeMs: number;
      filteredCount: number;
      totalCount: number;
    };
    isColdStart?: boolean;
  };
  error?: string;
}

/**
 * POST /api/events/filtered
 * Server-side event filtering with pagination and statistics
 */
export async function POST(request: NextRequest) {
  const requestTimestamp = request.headers.get('X-Request-Timestamp');
  const requestId = request.headers.get('X-Request-Id') || randomUUID();
  
  console.log('[API] Starting filtered events request', {
    requestId,
    requestTimestamp: requestTimestamp || 'not provided',
    serverTime: new Date().toISOString()
  });
  
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log('[API] Authentication failed:', authError);
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('[API] User authenticated:', user.id);

    // Optional onboarding requirement for filtered events
    const onboardingGuard = await requireOnboardedApi(supabase, user.id);
    if (onboardingGuard) {
      return onboardingGuard;
    }

    // Apply rate limiting (skip in development if KV not configured)
    try {
      const { success: rateLimitSuccess } = await ratelimit.limit(user.id);
      if (!rateLimitSuccess) {
        console.log('[API] Rate limit exceeded for user:', user.id);
        return NextResponse.json(
          { success: false, error: 'Too many requests. Please try again later.' },
          { status: 429 }
        );
      }
    } catch (rateLimitError) {
      // Skip rate limiting if KV is not configured (development mode)
      const errorMessage = rateLimitError instanceof Error ? rateLimitError.message : 'Unknown rate limit error';
      console.log('[API] Rate limiting skipped (KV not configured):', errorMessage);
    }

    // Parse and validate request
    const rawBody: FilteredEventsRequest = await request.json();
    const { sessionId: telemetrySessionId, surface: requestSurface, ...body } = rawBody;

    const {
      searchTerm,
      categories = [],
      locations = [],
      format = 'all',
    budget = 'all',
      cost = 'all',
      difficulty = 'all',
      dateRange,
      sortBy: rawSortBy = 'date',
      sortDirection = 'asc',
      page = 1,
      pageSize = 50,
      availability: _availability = 'all',
      popularity = 'all',
      duration = 'all',
      myTracked: _myTracked = false,
      myNetwork = false,
      recommended = false
    } = body;

    // Map 'default' to 'date' for consistency
    const sortBy = rawSortBy === 'default' ? 'date' : rawSortBy;
    
    // For career-impact sorting, default to descending if not specified
    const effectiveSortDirection = (sortBy === 'career-impact' && sortDirection === 'asc' && rawSortBy !== 'default')
      ? 'desc' // Default to desc for career-impact
      : sortDirection;
    
    // Validate pagination parameters
    if (page < 1 || pageSize < 1 || pageSize > 100) {
      return NextResponse.json(
        { success: false, error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    const requestId = request.headers.get('x-request-id') ?? randomUUID();

    const { data: consentRow } = await supabase
      .from('profiles')
      .select('analytics_consent')
      .eq('id', user.id)
      .single();

    const hasTelemetryConsent = Boolean(consentRow?.analytics_consent);

    // Build a stable cache signature (per-user + filters)
    const normalizedSignature = {
      userId: user.id,
      searchTerm: body.searchTerm || '',
      categories: (body.categories || []).slice().sort(),
      locations: (body.locations || []).slice().sort(),
      format,
      budget,
      cost,
      difficulty,
      dateStart: body.dateRange?.start || null,
      dateEnd: body.dateRange?.end || null,
      sortBy,
      sortDirection: effectiveSortDirection,
      page,
      pageSize,
      availability: _availability,
      popularity,
      duration,
      myNetwork,
      recommended,
      surface: requestSurface
    };

    const cacheKey = `fe2:${createHash('sha1').update(JSON.stringify(normalizedSignature)).digest('hex')}`;

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
      console.log('[API] Filtered events cache unavailable/disabled:', cacheErr instanceof Error ? cacheErr.message : 'unknown');
    }

    // Build comprehensive server-side filters
    const eventFilters: EventFilters = {
      categories: categories.length > 0 ? categories : undefined,
      locations: locations.length > 0 ? locations : undefined,
      searchTerm: searchTerm || undefined,
      startDate: dateRange?.start ? new Date(dateRange.start) : undefined,
      endDate: dateRange?.end ? new Date(dateRange.end) : undefined,
      format: format !== 'all' ? format : undefined,
      budget: budget !== 'all' ? budget : undefined,
      cost: cost !== 'all' ? cost : undefined,
      difficulty: difficulty !== 'all' ? difficulty : undefined,
      availability: _availability !== 'all' ? _availability : undefined,
      popularity: popularity !== 'all' ? popularity : undefined,
      duration: duration !== 'all' ? duration : undefined,
      myTracked: _myTracked || undefined,
      myNetwork: myNetwork || undefined,
      recommended: recommended || undefined,
      sortBy: sortBy !== 'date' ? sortBy : 'date',
      sortDirection: effectiveSortDirection === 'desc' ? 'desc' : 'asc'
    };

    // Ensure discover surface only shows future events by default
    if (requestSurface === 'discover' && !dateRange?.start) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (!eventFilters.startDate || eventFilters.startDate < today) {
        eventFilters.startDate = today;
      }
    }

    const telemetryContext: RecommendationTelemetryContext | undefined = hasTelemetryConsent ? {
      userId: user.id,
      hasConsent: true,
      sessionId: telemetrySessionId ?? null,
      requestId,
      source: 'backend',
      surface: 'filtered_events',
      additionalContext: {
        recommended,
        hasSearchTerm: Boolean(searchTerm),
        categoryCount: categories.length,
        ...(format !== 'all' ? { format } : {}),
        page
      }
    } : undefined;

    // Get user's career profile for scoring and cold start detection
    let careerProfile = null;
    try {
      careerProfile = await CareerProfileService.getCareerProfile(user.id, supabase);
    } catch (error) {
      // Profile might not exist for new users - this is fine
      console.log('No career profile found for user, skipping career impact scoring:', error);
    }

    // For career-impact sorting, we need to fetch a larger window to ensure pagination correctness
    // Events are sorted after enrichment, so we need all candidates before sorting
    const isCareerImpactSort = sortBy === 'career-impact';
    const fetchWindowMultiplier = isCareerImpactSort ? 5 : 1; // Fetch 5x pageSize for career-impact sorting
    const fetchPageSize = pageSize * fetchWindowMultiplier;
    const fetchPage = isCareerImpactSort ? 1 : page; // Always fetch from page 1 when using window
    
    // Get events using EventService (includes cold start & telemetry)
    let filteredEvents, totalEvents, isColdStart;
    try {
      const result = await EventService.getEventsWithColdStartHandling(
        eventFilters,
        supabase,
        careerProfile,
        user.id,
        fetchPage,
        fetchPageSize,
        telemetryContext,
        { skipColdStart: requestSurface === 'calendar' }
      );

      filteredEvents = result.events;
      totalEvents = result.totalCount;
      isColdStart = result.isColdStart;
      
    } catch (error) {
      console.error('[API] All event fetching methods failed:', error);
      console.error('[API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      return NextResponse.json(
        { success: false, error: 'Failed to fetch events' },
        { status: 500 }
      );
    }

    // Enrich events with career impact scores
    // Optimization: limit enrichment to early pages to reduce cost; defer deeper insights to detail view
    // Note: enrichment service now handles cold start internally (provides baseline scores for null profiles)
    // Exception: Always enrich when recommended filter is active or when sorting by career-impact
    const enrichMaxPageEnv = process.env.ENRICH_MAX_PAGE ? parseInt(process.env.ENRICH_MAX_PAGE, 10) : Number.NaN;
    const ENRICH_MAX_PAGE = Number.isFinite(enrichMaxPageEnv) && enrichMaxPageEnv > 0
      ? enrichMaxPageEnv
      : Number.MAX_SAFE_INTEGER;
    
    // Always enrich if: recommended filter is active, sorting by career-impact, or within enrich max page
    // For discovery view, always enrich to ensure recommendations work
    const shouldEnrich = recommended || isCareerImpactSort || page <= ENRICH_MAX_PAGE || requestSurface === 'discover';
    
    let enrichedEvents;
    try {
      if (!shouldEnrich) {
        enrichedEvents = filteredEvents;
        if (process.env.NODE_ENV !== 'production') {
          console.log('[API] Skipping enrichment - shouldEnrich:', shouldEnrich, 'page:', page, 'ENRICH_MAX_PAGE:', ENRICH_MAX_PAGE);
        }
      } else {
        // Always enrich - enrichment service handles cold start internally
        // Check if events already have careerImpact scores to avoid double enrichment
        const needsEnrichment = filteredEvents.some(event => {
          const hasScore = (event as { careerImpact?: { overall: number } }).careerImpact?.overall !== undefined;
          return !hasScore;
        });
        
        if (needsEnrichment) {
          if (process.env.NODE_ENV !== 'production') {
            console.log('[API] Enriching events:', {
              count: filteredEvents.length,
              isCareerImpactSort,
              recommended,
              surface: requestSurface,
              hasCareerProfile: !!careerProfile,
              eventIds: filteredEvents.slice(0, 5).map(e => e.id) // Sample of event IDs
            });
          }
          
          enrichedEvents = await EventService.enrichEventsWithCareerImpact(
            filteredEvents,
            careerProfile,
            supabase,
            user.id,
            false // Disable diversity enhancement for calendar - we want all events, not curated top 20
          );
          
          // Debug: log enrichment results with detailed breakdown
          if (process.env.NODE_ENV !== 'production') {
            const eventsWithScores = enrichedEvents.filter(e => {
              const score = (e as { careerImpact?: { overall: number } }).careerImpact?.overall ?? 0;
              return score > 0;
            });
            const eventsWithoutScores = enrichedEvents.filter(e => {
              const score = (e as { careerImpact?: { overall: number } }).careerImpact?.overall ?? 0;
              return score === 0;
            });
            
            console.log('[API] Enrichment complete:', {
              totalEvents: enrichedEvents.length,
              eventsWithScores: eventsWithScores.length,
              eventsWithoutScores: eventsWithoutScores.length,
              scoreRange: enrichedEvents.length > 0 ? {
                min: Math.min(...enrichedEvents.map(e => (e as { careerImpact?: { overall: number } }).careerImpact?.overall ?? 0)),
                max: Math.max(...enrichedEvents.map(e => (e as { careerImpact?: { overall: number } }).careerImpact?.overall ?? 0)),
                avg: enrichedEvents.reduce((sum, e) => sum + ((e as { careerImpact?: { overall: number } }).careerImpact?.overall ?? 0), 0) / enrichedEvents.length
              } : null,
              sampleWithoutScores: eventsWithoutScores.slice(0, 3).map(e => ({
                id: e.id,
                title: e.title?.substring(0, 50),
                hasStartTime: !!e.startTime,
                hasDescription: !!e.description
              }))
            });
          }
        } else {
          // Events already enriched (e.g., from lookalike recommendations)
          enrichedEvents = filteredEvents;
          if (process.env.NODE_ENV !== 'production') {
            console.log('[API] Events already enriched, skipping');
          }
        }
      }
    } catch (error) {
      console.error('Error enriching events with career impact:', error);
      // Fallback to using events without enrichment
      enrichedEvents = filteredEvents;
    }

    // Post-enrichment sorting: if sortBy is 'career-impact', sort by career impact scores
    // This must happen after enrichment since scores are calculated during enrichment
    if (sortBy === 'career-impact' && enrichedEvents.length > 0) {
      enrichedEvents = [...enrichedEvents].sort((a, b) => {
        const aScore = (a as { careerImpact?: { overall: number } }).careerImpact?.overall ?? 0;
        const bScore = (b as { careerImpact?: { overall: number } }).careerImpact?.overall ?? 0;
        
        // Respect sortDirection parameter (already defaulted to desc for career-impact)
        const isDescending = effectiveSortDirection !== 'asc';
        
        if (isDescending) {
          // Descending: higher scores first (default for career impact)
          if (bScore !== aScore) return bScore - aScore;
        } else {
          // Ascending: lower scores first (respect user choice)
          if (aScore !== bScore) return aScore - bScore;
        }
        
        // Tie-breaker: sort by start_time (earlier events first)
        const aStart = new Date(a.startTime).getTime();
        const bStart = new Date(b.startTime).getTime();
        return aStart - bStart;
      });
    }
    
    // Apply recommended filter after enrichment (if not already applied server-side)
    // This ensures the filter works correctly even on later pages
    if (recommended && enrichedEvents.length > 0) {
      enrichedEvents = enrichedEvents.filter(event => {
        const score = (event as { careerImpact?: { overall: number } }).careerImpact?.overall ?? 0;
        return score >= 50; // RECOMMENDATION_THRESHOLDS.RECOMMENDED
      });
    }
    
    // For career-impact sorting with window fetching, paginate after sorting
    // Calculate the correct slice to return based on original page request
    if (isCareerImpactSort && fetchWindowMultiplier > 1) {
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      enrichedEvents = enrichedEvents.slice(startIndex, endIndex);
      
      // Update totalEvents to reflect the actual filtered count after enrichment/sorting
      // For career-impact sorting, we can't know the exact total without fetching all events
      // So we estimate based on the window we fetched
      // If we got fewer events than the window size, we've reached the end
      if (filteredEvents.length < fetchPageSize) {
        totalEvents = startIndex + enrichedEvents.length;
      } else {
        // Estimate: assume there are more events beyond our window
        // This is approximate but better than showing incorrect pagination
        totalEvents = Math.max(totalEvents, startIndex + enrichedEvents.length);
      }
    }

    // Generate filter statistics (simplified since filtering is now at database level)
    const availableFilters = {
      categories: await getAvailableCategories(supabase),
      difficulties: [
        { value: 'beginner', count: 0 }, // Would need separate queries for accurate counts
        { value: 'intermediate', count: 0 },
        { value: 'advanced', count: 0 },
      ],
      formats: [
        { value: 'virtual', count: 0 }, // Would need separate queries for accurate counts
        { value: 'in-person', count: 0 },
        { value: 'hybrid', count: 0 },
      ],
      locations: []
    };

    const processingTime = Date.now() - startTime;

    const response: FilteredEventsResponse = {
      success: true,
      data: {
        events: enrichedEvents,
        pagination: {
          page,
          pageSize,
          total: totalEvents,
          hasMore: page * pageSize < totalEvents
        },
        filters: {
          applied: { searchTerm, categories, locations, format, cost, difficulty, dateRange, sortBy },
          available: availableFilters
        },
        stats: {
          processingTimeMs: processingTime,
          filteredCount: enrichedEvents.length,
          totalCount: totalEvents
        },
        isColdStart
      }
    };

    // Store in cache with short TTL to coalesce rapid toggles
    try {
      await kv.set(cacheKey, response, { ex: 60 });
    } catch (cacheSetErr) {
      console.log('[API] Failed to set filtered events cache:', cacheSetErr instanceof Error ? cacheSetErr.message : 'unknown');
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

// Helper methods for server-side filtering
async function getAvailableCategories(supabase: Awaited<ReturnType<typeof createClient>>): Promise<Array<{ id: string; name: string; count: number }>> {
  try {
    const { data } = await supabase
      .from('event_type')
      .select('id, name')
      .order('name');

    return (data || [])
      .filter(item => item.name) // Filter out null names
      .map(item => ({
        id: item.id,
        name: item.name!,
        count: 0 // Will be calculated by frontend if needed
      }));
  } catch {
    return [];
  }
}
