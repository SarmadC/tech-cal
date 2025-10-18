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
  format?: 'all' | 'virtual' | 'in-person' | 'hybrid';
  budget?: 'all' | 'free-only' | 'low' | 'moderate' | 'high' | 'unlimited';
  cost?: 'all' | 'free' | 'paid';
  difficulty?: 'all' | 'beginner' | 'intermediate' | 'advanced';
  dateRange?: {
    start?: string;
    end?: string;
  };
  sortBy?: 'date' | 'popularity' | 'career-impact';
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
  console.log('[API] Starting filtered events request');
  
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
    const { sessionId: telemetrySessionId, ...body } = rawBody;
    console.log('[API] Request body:', JSON.stringify(body, null, 2));
    
    const {
      searchTerm,
      categories = [],
      format = 'all',
    budget = 'all',
      cost = 'all',
      difficulty = 'all',
      dateRange,
      sortBy = 'date',
      page = 1,
      pageSize = 50,
      availability: _availability = 'all',
      popularity = 'all',
      duration = 'all',
      myTracked: _myTracked = false,
      myNetwork = false,
      recommended = false
    } = body;

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
      format,
      budget,
      cost,
      difficulty,
      dateStart: body.dateRange?.start || null,
      dateEnd: body.dateRange?.end || null,
      sortBy,
      page,
      pageSize,
      availability: _availability,
      popularity,
      duration,
      myNetwork,
      recommended
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
      sortBy: sortBy !== 'date' ? sortBy : undefined
    };

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

    // Get events using EventService (includes cold start & telemetry)
    let filteredEvents, totalEvents, isColdStart;
    try {
      const result = await EventService.getEventsWithColdStartHandling(
        eventFilters,
        supabase,
        careerProfile,
        user.id,
        page,
        pageSize,
        telemetryContext
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
    const ENRICH_MAX_PAGE = parseInt(process.env.ENRICH_MAX_PAGE || '1');
    let enrichedEvents;
    try {
      if (page > ENRICH_MAX_PAGE) {
        enrichedEvents = filteredEvents;
      } else {
        enrichedEvents = isColdStart
          ? filteredEvents // Cold start events already have metadata
          : await EventService.enrichEventsWithCareerImpact(
              filteredEvents,
              careerProfile,
              supabase,
              user.id
            );
      }
    } catch (error) {
      console.error('Error enriching events with career impact:', error);
      // Fallback to using events without enrichment
      enrichedEvents = filteredEvents;
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
      ]
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
          applied: { searchTerm, categories, format, cost, difficulty, dateRange, sortBy },
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
