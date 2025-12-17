import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { EventService } from '@/services/eventServices';
import { CareerProfileService } from '@/services/careerProfileService';
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';
import { EventFilters, RecommendationTelemetryContext } from '@/types';
import { createHash, randomUUID } from 'crypto';
import { requireOnboardedApi } from '@/utils/onboarding';
import { UserLocation } from '@/services/locationScoringService';
import { FilterCounts } from '@/utils/filterCountUtils';

/**
 * Extract city from a location string (e.g., "San Francisco, CA, USA" -> "San Francisco")
 */
function extractCityFromLocation(location: string): string | undefined {
  if (!location) return undefined;
  const parts = location.split(',').map(p => p.trim());
  return parts[0] || undefined;
}

/**
 * Extract country from a location string (e.g., "San Francisco, CA, USA" -> "USA")
 */
function extractCountryFromLocation(location: string): string | undefined {
  if (!location) return undefined;
  const parts = location.split(',').map(p => p.trim());
  // Country is typically the last part
  return parts[parts.length - 1] || undefined;
}

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
  tags?: string[];
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
  fastSearch?: boolean; // Skip enrichment and counts for instant search results
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
    counts?: FilterCounts;
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
    const { sessionId: telemetrySessionId, surface: requestSurface, fastSearch = false, ...body } = rawBody;

    const {
      searchTerm,
      categories = [],
      tags = [],
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
      tags: (body.tags || []).slice().sort(),
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
      tags: tags.length > 0 ? tags : undefined,
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
    
    // Extract user location for location-based scoring
    // Priority: 1) Profile preferences, 2) Profile timezone, 3) Request timezone header
    let userLocation: UserLocation | null = null;
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('preferences, timezone, location')
        .eq('id', user.id)
        .single();
      
      if (profileData) {
        const preferences = profileData.preferences as Record<string, unknown> | null;
        const profileLocation = preferences?.location as Record<string, string> | null;
        
        userLocation = {
          city: profileLocation?.city || (profileData.location ? extractCityFromLocation(profileData.location) : undefined),
          country: profileLocation?.country || (profileData.location ? extractCountryFromLocation(profileData.location) : undefined),
          timezone: profileData.timezone || request.headers.get('x-timezone') || undefined,
        };
      }
    } catch (error) {
      console.log('[API] Failed to extract user location for scoring:', error);
    }

    // For career-impact sorting, we need to fetch a larger window to ensure pagination correctness
    // Events are sorted after enrichment, so we need all candidates before sorting
    const isCareerImpactSort = sortBy === 'career-impact';
    const fetchWindowMultiplier = isCareerImpactSort ? 5 : 1; // Fetch 5x pageSize for career-impact sorting
    const fetchPageSize = pageSize * fetchWindowMultiplier;
    const fetchPage = isCareerImpactSort ? 1 : page; // Always fetch from page 1 when using window
    
    // Enhanced search: Combine FTS with tag and organizer search
    // Apply tag filtering if tags are specified
    if (tags.length > 0) {
      try {
        console.log('[DEBUG] Filtering by tags:', tags);
        // Get event IDs that match any of the selected tags (exact match, case-insensitive)
        const tagFilteredEventIds = await EventService.getEventIdsByTags(tags, supabase, eventFilters);
        console.log('[DEBUG] Tag filter results:', tagFilteredEventIds.length, 'events');
        
        // If we have tag-filtered IDs, add them to eventFilters to restrict the main query
        if (tagFilteredEventIds.length > 0) {
          const existingIds = eventFilters.eventIds || [];
          eventFilters.eventIds = [...new Set([...existingIds, ...tagFilteredEventIds])];
        } else {
          // No events match the tags, return empty result early
          return NextResponse.json({
            success: true,
            data: {
              events: [],
              pagination: {
                page,
                pageSize,
                total: 0,
                hasMore: false
              },
              filters: {
                applied: { searchTerm, categories, tags, locations, format, cost, difficulty, dateRange, sortBy },
                available: {
                  categories: [],
                  difficulties: [],
                  formats: [],
                  locations: []
                }
              },
              stats: {
                processingTimeMs: Date.now() - startTime,
                filteredCount: 0,
                totalCount: 0
              },
              counts: await EventService.getFilterCounts(eventFilters, supabase)
            }
          });
        }
      } catch (error) {
        console.error('[API] Tag filter error:', error);
        // Continue without tag filtering if it fails
      }
    }

    // PERSONALIZED RANKING: Events are later enriched with career-impact scores
    // and sorted by career-impact if sortBy='career-impact', which combines:
    // - FTS relevance (implicit from tag/organizer matches getting higher scores)
    // - Career profile matching (skills, goals, interests)
    // - Tag similarity scores
    // TODO: Future enhancement - capture PostgreSQL ts_rank() for explicit FTS weighting
    let tagMatchedEventIds: string[] = [];
    let organizerMatchedEventIds: string[] = [];
    let expandedSearchTerms: string[] = [];

    if (searchTerm && searchTerm.trim()) {
      try {
        // OPTIMIZATION: Skip expansion for very short queries (< 3 chars) or fast search mode
        const trimmedSearchTerm = searchTerm.trim();
        const shouldExpand = !fastSearch && trimmedSearchTerm.length >= 3;

        if (shouldExpand) {
          // Import TagBasedMatchingService dynamically to use expandSearchTerm
          const { TagBasedMatchingService } = await import('@/services/tagBasedMatchingService');

          // MULTI-QUERY OPTIMIZATION: Expand search term using TAG_SIMILARITIES
          const expansionStart = Date.now();
          const allExpandedTerms = TagBasedMatchingService.expandSearchTerm(trimmedSearchTerm);
          const expansionTime = Date.now() - expansionStart;

          // OPTIMIZATION: Limit expansion to top 5 terms for longer queries to reduce overhead
          // Keep original term first, then limit similar terms
          expandedSearchTerms = allExpandedTerms.length > 5 
            ? [trimmedSearchTerm.toLowerCase(), ...allExpandedTerms.slice(1, 5)]
            : allExpandedTerms;

          // Performance logging for query expansion
          console.log('[PERF] Query expansion:', {
            original: trimmedSearchTerm,
            expanded: expandedSearchTerms,
            totalExpanded: allExpandedTerms.length,
            limitedTo: expandedSearchTerms.length,
            expansionTimeMs: expansionTime,
            expansionFactor: expandedSearchTerms.length
          });
        } else {
          // For short queries, use original term only (no expansion)
          expandedSearchTerms = [trimmedSearchTerm.toLowerCase()];
          console.log('[PERF] Query expansion skipped (short query):', {
            original: trimmedSearchTerm,
            length: trimmedSearchTerm.length
          });
        }

        // OPTIMIZATION: Conditional multi-query approach based on query length
        // Short queries (< 3 chars): FTS only (skip tag/organizer searches for instant results)
        // Medium queries (3-10 chars): FTS + tag search (skip organizer for faster results)
        // Long queries (> 10 chars): Full multi-query approach (FTS + tags + organizer)
        // 
        // ADDITIONAL OPTIMIZATION: Skip tag search for very common single-word terms that will match too many events
        // These terms are better handled by FTS alone for performance
        const queryLength = trimmedSearchTerm.length;
        const commonTerms = ['data', 'ai', 'web', 'app', 'code', 'tech', 'dev', 'cloud', 'api'];
        const isCommonTerm = commonTerms.includes(trimmedSearchTerm.toLowerCase());
        const useTagSearch = queryLength >= 3 && !isCommonTerm; // Skip tag search for common terms
        const useOrganizerSearch = queryLength > 10 && !isCommonTerm;

        const parallelSearchStart = Date.now();
        const searchPromises: Promise<string[]>[] = [];

        if (useTagSearch) {
          // Add tag searches for all expanded terms
          // OPTIMIZATION: Add timeout wrapper to prevent slow queries from blocking
          expandedSearchTerms.forEach(term => {
            const tagSearchPromise = EventService.getEventIdsByTagSearch(term, supabase, eventFilters);
            // Add timeout of 1 second per tag search to prevent blocking
            const timeoutPromise = new Promise<string[]>((resolve) => {
              setTimeout(() => {
                console.warn(`[PERF] Tag search timeout for term: ${term}`);
                resolve([]); // Return empty on timeout
              }, 1000);
            });
            searchPromises.push(Promise.race([tagSearchPromise, timeoutPromise]));
          });
        }

        if (useOrganizerSearch) {
          // Add organizer searches for all expanded terms
          // OPTIMIZATION: Add timeout wrapper to prevent slow queries from blocking
          expandedSearchTerms.forEach(term => {
            const orgSearchPromise = EventService.getEventIdsByOrganizerSearch(term, supabase);
            // Add timeout of 1 second per organizer search to prevent blocking
            const timeoutPromise = new Promise<string[]>((resolve) => {
              setTimeout(() => {
                console.warn(`[PERF] Organizer search timeout for term: ${term}`);
                resolve([]); // Return empty on timeout
              }, 1000);
            });
            searchPromises.push(Promise.race([orgSearchPromise, timeoutPromise]));
          });
        }

        // Execute queries in parallel (if any)
        const results = searchPromises.length > 0 
          ? await Promise.all(searchPromises)
          : [];
        const parallelSearchTime = Date.now() - parallelSearchStart;

        // Separate tag and organizer results based on which searches were executed
        const tagResults: string[][] = [];
        const orgResults: string[][] = [];

        if (useTagSearch && useOrganizerSearch) {
          // Both searches executed - alternate pattern
          results.forEach((ids, index) => {
            if (index % 2 === 0) {
              tagResults.push(ids);
            } else {
              orgResults.push(ids);
            }
          });
        } else if (useTagSearch) {
          // Only tag searches executed
          results.forEach(ids => tagResults.push(ids));
        } else if (useOrganizerSearch) {
          // Only organizer searches executed
          results.forEach(ids => orgResults.push(ids));
        }

        // DEDUPLICATION: Flatten and deduplicate results
        const dedupeStart = Date.now();
        tagMatchedEventIds = tagResults.length > 0 ? [...new Set(tagResults.flat())] : [];
        organizerMatchedEventIds = orgResults.length > 0 ? [...new Set(orgResults.flat())] : [];
        const dedupeTime = Date.now() - dedupeStart;

        const totalQueries = searchPromises.length;

        // Performance metrics for multi-query optimization
        const avgQueryTime = totalQueries > 0 ? Math.round(parallelSearchTime / totalQueries) : 0;
        console.log('[PERF] Multi-query optimization:', {
          searchTerm,
          queryLength,
          strategy: queryLength < 3 ? 'FTS-only' : queryLength <= 10 ? 'FTS+tags' : 'FTS+tags+organizer',
          queriesExecuted: totalQueries,
          tagSearchEnabled: useTagSearch,
          organizerSearchEnabled: useOrganizerSearch,
          parallelExecutionTimeMs: parallelSearchTime,
          avgQueryTimeMs: avgQueryTime,
          deduplicationTimeMs: dedupeTime,
          results: {
            tagMatches: tagMatchedEventIds.length,
            organizerMatches: organizerMatchedEventIds.length,
            totalUniqueMatches: new Set([...tagMatchedEventIds, ...organizerMatchedEventIds]).size
          },
          // Estimate sequential execution time (if queries ran one-by-one)
          estimatedSequentialTimeMs: totalQueries * avgQueryTime,
          // Time saved by parallel execution
          timeSavedMs: Math.max(0, (totalQueries * avgQueryTime) - parallelSearchTime)
        });
      } catch (error) {
        console.error('[API] Multi-field search error:', error);
        // Continue with FTS-only search if tag/org search fails
      }
    }

    // Combine all matched event IDs (FTS will be handled by main query)
    const additionalEventIds = [
      ...tagMatchedEventIds,
      ...organizerMatchedEventIds
    ];

    // Debug logging for event ID merging
    console.log('[DEBUG Merge] Additional event IDs:', additionalEventIds.length);

    // Add matched event IDs to filters to include them in results
    if (additionalEventIds.length > 0) {
      // Merge with existing eventIds filter if present
      const existingIds = eventFilters.eventIds || [];
      eventFilters.eventIds = [...new Set([...existingIds, ...additionalEventIds])];
      console.log('[DEBUG Merge] Final eventIds filter:', eventFilters.eventIds.length, 'IDs:', eventFilters.eventIds.slice(0, 5));
    }

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
    
    // OPTIMIZATION: Skip enrichment for simple searches (just search term, no other filters) to improve performance
    // Enrichment adds significant latency and may not be needed for basic searches
    const hasOnlySearchTerm = Boolean(searchTerm) && 
      categories.length === 0 && 
      tags.length === 0 && 
      locations.length === 0 &&
      format === 'all' && 
      budget === 'all' && 
      cost === 'all' && 
      difficulty === 'all' &&
      !dateRange?.start && 
      !dateRange?.end &&
      popularity === 'all' &&
      duration === 'all' &&
      !myNetwork &&
      !recommended &&
      sortBy !== 'career-impact';
    
    // Always enrich if: recommended filter is active, sorting by career-impact, or within enrich max page
    // For discovery view, enrich only if there are filters beyond just search term
    // Skip enrichment entirely for fast search mode (typing-as-you-search)
    const shouldEnrich = !fastSearch && (
      recommended || isCareerImpactSort || (page <= ENRICH_MAX_PAGE && !hasOnlySearchTerm) || (requestSurface === 'discover' && !hasOnlySearchTerm)
    );
    
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
            false, // Disable diversity enhancement for calendar - we want all events, not curated top 20
            userLocation // Pass user location for proximity scoring
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
    // Skip expensive filter count computation for fast search mode
    const counts = fastSearch ? null : await EventService.getFilterCounts(eventFilters, supabase);
    const availableFilters = fastSearch ? {
      categories: [],
      difficulties: [
        { value: 'beginner', count: 0 },
        { value: 'intermediate', count: 0 },
        { value: 'advanced', count: 0 },
      ],
      formats: [
        { value: 'virtual', count: 0 },
        { value: 'in-person', count: 0 },
        { value: 'hybrid', count: 0 },
      ],
      locations: []
    } : {
      categories: (await getAvailableCategories(supabase)).map((cat) => ({
        ...cat,
        count: counts?.categories[cat.id] || 0
      })),
      difficulties: [
        { value: 'beginner', count: 0 }, // Would need separate queries for accurate counts
        { value: 'intermediate', count: 0 },
        { value: 'advanced', count: 0 },
      ],
      formats: [
        { value: 'virtual', count: counts?.format.virtual || 0 },
        { value: 'in-person', count: counts?.format['in-person'] || 0 },
        { value: 'hybrid', count: counts?.format.hybrid || 0 },
      ],
      locations: []
    };

    const processingTime = Date.now() - startTime;

    // Log overall performance summary
    console.log('[PERF] Request summary:', {
      requestId,
      processingTimeMs: processingTime,
      fastSearch,
      filtersApplied: {
        hasSearch: Boolean(searchTerm),
        categoriesCount: categories.length,
        tagsCount: tags.length,
        locationsCount: locations.length,
        format: format !== 'all' ? format : null,
        budget: budget !== 'all' ? budget : null,
        cost: cost !== 'all' ? cost : null,
        difficulty: difficulty !== 'all' ? difficulty : null,
        isRecommended: recommended,
        sortBy
      },
      results: {
        returned: enrichedEvents.length,
        total: totalEvents,
        isColdStart
      }
    });

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
          applied: { searchTerm, categories, tags, locations, format, cost, difficulty, dateRange, sortBy },
          available: availableFilters
        },
        stats: {
          processingTimeMs: processingTime,
          filteredCount: enrichedEvents.length,
          totalCount: totalEvents
        },
        isColdStart,
        counts: counts ?? undefined
      }
    };

    // OPTIMIZATION: Store in cache with longer TTL for better performance
    // For common searches (just search term, no other filters), use longer TTL (5 minutes)
    // For other searches, use shorter TTL (2 minutes)
    // Reuse hasOnlySearchTerm defined earlier for enrichment decision
    const cacheTTL = hasOnlySearchTerm ? 300 : 120; // 5 minutes for simple searches, 2 minutes for complex
    
    try {
      await kv.set(cacheKey, response, { ex: cacheTTL });
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
