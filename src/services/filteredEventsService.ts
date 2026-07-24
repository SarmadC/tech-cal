import type {
  Event,
  EventFilters,
  RecommendationTelemetryContext,
  SupabaseClientType,
  FilteredEventsData,
} from '@/types';
import type { CareerProfile } from '@/types/career';
import type { UserLocation } from '@/services/locationScoringService';

import { EventService } from '@/services/eventServices';
import { RECOMMENDATION_THRESHOLDS } from '@/config/recommendationThresholds';
import { logger } from '@/utils/logger';
import { extractCityFromLocation, extractCountryFromLocation } from '@/utils/locationUtils';
import {
  type BestMatchCandidateCounts,
  type FilteredRecommendationCandidates,
  type HybridBestMatchRecommendationCandidates,
  fetchFilteredRecommendationCandidates,
  fetchHybridBestMatchCandidates,
  rankEventsWithRecommendationPipeline,
} from '@/services/recommendations/recommendationPipeline';

export interface FilteredEventsRequest {
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
  availability?: 'all' | 'available' | 'no-conflicts';
  popularity?: 'all' | 'trending' | 'high-attendance' | 'niche';
  duration?: 'all' | 'short' | 'medium' | 'long' | 'multi-day';
  myTracked?: boolean;
  myNetwork?: boolean;
  recommended?: boolean;
  sessionId?: string;
  surface?: 'calendar' | 'discover' | 'default';
  fastSearch?: boolean;
  tagMatchMode?: 'all' | 'any';
}

export interface NormalizedFilteredEventsRequest {
  rawSearchTerm: string;
  searchTerm: string;
  categories: string[];
  tags: string[];
  rawLocations: string[];
  locations: string[];
  format: 'all' | 'virtual' | 'in-person' | 'hybrid';
  budget: 'all' | 'free-only' | 'low' | 'moderate' | 'high' | 'unlimited';
  cost: 'all' | 'free' | 'paid';
  difficulty: 'all' | 'beginner' | 'intermediate' | 'advanced';
  dateRange?: {
    start?: string;
    end?: string;
  };
  sortBy: 'date' | 'popularity' | 'career-impact' | 'title' | 'location';
  sortDirection: 'asc' | 'desc';
  page: number;
  pageSize: number;
  availability: 'all' | 'available' | 'no-conflicts';
  popularity: 'all' | 'trending' | 'high-attendance' | 'niche';
  duration: 'all' | 'short' | 'medium' | 'long' | 'multi-day';
  myTracked: boolean;
  myNetwork: boolean;
  recommended: boolean;
  sessionId?: string;
  surface: 'calendar' | 'discover' | 'default';
  fastSearch: boolean;
  tagMatchMode: 'all' | 'any';
}

interface LoadFilteredEventsDataOptions {
  request: NormalizedFilteredEventsRequest;
  supabase: SupabaseClientType;
  userId: string;
  careerProfile: CareerProfile | null;
  userLocation?: UserLocation | null;
  telemetry?: RecommendationTelemetryContext;
  requestId?: string;
  skipColdStart?: boolean;
}

interface ProfileLocationContext {
  preferences?: unknown;
  timezone?: string | null;
  location?: string | null;
}

interface RecommendedCandidateWindow extends FilteredRecommendationCandidates {
  retrievalStrategy: 'filtered-only' | 'hybrid-best-match-v1';
  candidateCounts: BestMatchCandidateCounts;
  supplemented: boolean;
  fetchedAllCandidates: boolean;
}

const MAX_RECOMMENDED_CANDIDATE_SCAN = 1000;
const MIN_RECOMMENDED_CANDIDATE_SCAN = 250;

function getRecommendedThresholdScore(
  event: Event | { careerImpact?: { overall?: number } }
): number {
  const scoredEvent = event as { careerImpact?: { overall?: number } };
  return scoredEvent.careerImpact?.overall ?? 0;
}

async function fetchRecommendedCandidateWindow({
  filters,
  supabase,
  careerProfile,
  userId,
  telemetry,
  skipColdStart,
  page,
  pageSize,
  useHybridBestMatch,
}: {
  filters: EventFilters;
  supabase: SupabaseClientType;
  careerProfile: CareerProfile | null;
  userId: string;
  telemetry?: RecommendationTelemetryContext;
  skipColdStart: boolean;
  page: number;
  pageSize: number;
  useHybridBestMatch: boolean;
}): Promise<RecommendedCandidateWindow> {
  const initialScanSize = Math.min(
    Math.max(page * pageSize * 5, pageSize, MIN_RECOMMENDED_CANDIDATE_SCAN),
    MAX_RECOMMENDED_CANDIDATE_SCAN
  );

  const fetchWindow = async (
    requestedPageSize: number,
    telemetryContext?: RecommendationTelemetryContext
  ): Promise<HybridBestMatchRecommendationCandidates> => {
    if (useHybridBestMatch) {
      return fetchHybridBestMatchCandidates({
        filters,
        supabaseClient: supabase,
        careerProfile,
        userId,
        page: 1,
        pageSize: requestedPageSize,
        telemetry: telemetryContext,
        skipColdStart,
      });
    }

    const result = await fetchFilteredRecommendationCandidates({
      filters,
      supabaseClient: supabase,
      careerProfile,
      userId,
      page: 1,
      pageSize: requestedPageSize,
      telemetry: telemetryContext,
      skipColdStart,
    });

    return {
      ...result,
      retrievalStrategy: 'filtered-only',
      candidateCounts: {
        broad: result.events.length,
        personalizedRaw: 0,
        personalizedFiltered: 0,
        merged: result.events.length,
      },
      supplemented: false,
    };
  };

  let result = await fetchWindow(initialScanSize, telemetry);

  const shouldRefetchAllAvailableCandidates =
    result.totalCount > result.events.length
    && result.totalCount <= MAX_RECOMMENDED_CANDIDATE_SCAN;

  if (shouldRefetchAllAvailableCandidates) {
    result = await fetchWindow(result.totalCount, undefined);
  } else if (
    result.totalCount > result.events.length
    && result.events.length < MAX_RECOMMENDED_CANDIDATE_SCAN
    && initialScanSize < MAX_RECOMMENDED_CANDIDATE_SCAN
  ) {
    result = await fetchWindow(MAX_RECOMMENDED_CANDIDATE_SCAN, undefined);
  }

  return {
    ...result,
    fetchedAllCandidates: result.events.length >= result.totalCount,
  };
}

export function normalizeFilteredEventsRequest(
  rawBody: FilteredEventsRequest
): NormalizedFilteredEventsRequest {
  const rawSearchTerm = (rawBody.searchTerm || '').trim();
  const rawLocations = (rawBody.locations || []).map((location) => location.trim()).filter(Boolean);
  const rawSortBy = rawBody.sortBy ?? 'date';
  const sortBy = rawSortBy === 'default' ? 'date' : rawSortBy;
  const sortDirection = sortBy === 'career-impact' ? 'desc' : (rawBody.sortDirection ?? 'asc');

  return {
    rawSearchTerm,
    searchTerm: rawSearchTerm.toLowerCase(),
    categories: rawBody.categories ?? [],
    tags: rawBody.tags ?? [],
    rawLocations,
    locations: rawLocations.map((location) => location.toLowerCase()),
    format: rawBody.format ?? 'all',
    budget: rawBody.budget ?? 'all',
    cost: rawBody.cost ?? 'all',
    difficulty: rawBody.difficulty ?? 'all',
    dateRange: rawBody.dateRange,
    sortBy,
    sortDirection,
    page: rawBody.page ?? 1,
    pageSize: rawBody.pageSize ?? 50,
    availability: rawBody.availability ?? 'all',
    popularity: rawBody.popularity ?? 'all',
    duration: rawBody.duration ?? 'all',
    myTracked: rawBody.myTracked ?? false,
    myNetwork: rawBody.myNetwork ?? false,
    recommended: rawBody.recommended ?? false,
    sessionId: rawBody.sessionId,
    surface: rawBody.surface ?? 'default',
    fastSearch: rawBody.fastSearch ?? false,
    tagMatchMode: rawBody.tagMatchMode ?? (rawBody.surface === 'calendar' ? 'any' : 'all'),
  };
}

export function buildUserLocationFromProfileContext(
  profileContext: ProfileLocationContext | null | undefined,
  timezoneOverride?: string | null
): UserLocation | null {
  if (!profileContext) {
    return null;
  }

  const preferences =
    profileContext.preferences && typeof profileContext.preferences === 'object'
      ? (profileContext.preferences as Record<string, unknown>)
      : null;
  const profileLocation =
    preferences?.location && typeof preferences.location === 'object'
      ? (preferences.location as Record<string, string>)
      : null;

  return {
    city:
      profileLocation?.city ||
      (profileContext.location ? extractCityFromLocation(profileContext.location) : undefined),
    country:
      profileLocation?.country ||
      (profileContext.location ? extractCountryFromLocation(profileContext.location) : undefined),
    timezone: profileContext.timezone || timezoneOverride || undefined,
  };
}

export async function loadFilteredEventsData({
  request,
  supabase,
  userId,
  careerProfile,
  userLocation,
  telemetry,
  requestId,
  skipColdStart = request.surface === 'calendar',
}: LoadFilteredEventsDataOptions): Promise<FilteredEventsData> {
  const startTime = Date.now();

  const eventFilters: EventFilters = {
    categories: request.categories.length > 0 ? request.categories : undefined,
    tags: request.tags.length > 0 ? request.tags : undefined,
    locations: request.locations.length > 0 ? request.locations : undefined,
    searchTerm: request.searchTerm || undefined,
    startDate: request.dateRange?.start ? new Date(request.dateRange.start) : undefined,
    endDate: request.dateRange?.end ? new Date(request.dateRange.end) : undefined,
    status: ['confirmed'],
    format: request.format !== 'all' ? request.format : undefined,
    budget: request.budget !== 'all' ? request.budget : undefined,
    cost: request.cost !== 'all' ? request.cost : undefined,
    difficulty: request.difficulty !== 'all' ? request.difficulty : undefined,
    availability: request.availability !== 'all' ? request.availability : undefined,
    popularity: request.popularity !== 'all' ? request.popularity : undefined,
    duration: request.duration !== 'all' ? request.duration : undefined,
    myTracked: request.myTracked || undefined,
    myNetwork: request.myNetwork || undefined,
    sortBy: request.sortBy !== 'date' ? request.sortBy : 'date',
    sortDirection: request.sortDirection === 'desc' ? 'desc' : 'asc',
  };

  if (request.surface === 'discover' && !request.dateRange?.start && !request.searchTerm) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!eventFilters.startDate || eventFilters.startDate < today) {
      eventFilters.startDate = today;
    }
  }

  const isCareerImpactSort = request.sortBy === 'career-impact';
  const shouldUseHybridBestMatch = Boolean(
    (isCareerImpactSort || request.recommended)
    && !request.fastSearch
    && careerProfile
    && userId
  );
  const fetchWindowMultiplier = isCareerImpactSort ? Math.min(Math.max(5, request.page), 20) : 1;
  const fetchPageSize = request.pageSize * fetchWindowMultiplier;
  const fetchPage = isCareerImpactSort ? 1 : request.page;

  if (request.tags.length > 0) {
    try {
      logger.debug('[DEBUG] Filtering by tags:', request.tags);
      const tagFilteredEventIds = await EventService.getEventIdsByTags(
        request.tags,
        supabase,
        eventFilters,
        request.tagMatchMode
      );
      logger.debug('[DEBUG] Tag filter results:', tagFilteredEventIds.length, 'events');

      if (tagFilteredEventIds.length > 0) {
        const existingIds = eventFilters.eventIds || [];
        eventFilters.eventIds = [...new Set([...existingIds, ...tagFilteredEventIds])];
      } else {
        return {
          events: [],
          pagination: {
            page: request.page,
            pageSize: request.pageSize,
            total: 0,
            hasMore: false,
          },
          filters: {
            applied: {
              searchTerm: request.rawSearchTerm,
              categories: request.categories,
              tags: request.tags,
              locations: request.rawLocations,
              format: request.format,
              cost: request.cost,
              difficulty: request.difficulty,
              dateRange: request.dateRange,
              sortBy: request.sortBy,
            },
            available: {
              categories: [],
              difficulties: [],
              formats: [],
              locations: [],
            },
          },
          stats: {
            processingTimeMs: Date.now() - startTime,
            filteredCount: 0,
            totalCount: 0,
          },
          counts: await EventService.getFilterCounts(eventFilters, supabase),
        };
      }
    } catch (error) {
      console.error('[FilteredEventsService] Tag filter error:', error);
    }
  }

  let tagMatchedEventIds: string[] = [];
  let organizerMatchedEventIds: string[] = [];
  let expandedSearchTerms: string[] = [];

  if (request.rawSearchTerm) {
    try {
      const trimmedSearchTerm = request.rawSearchTerm;
      const shouldExpand = !request.fastSearch && trimmedSearchTerm.length >= 3;

      if (shouldExpand) {
        const { TagBasedMatchingService } = await import('@/services/tagBasedMatchingService');
        const allExpandedTerms = TagBasedMatchingService.expandSearchTerm(trimmedSearchTerm);
        expandedSearchTerms = allExpandedTerms.length > 5
          ? [trimmedSearchTerm.toLowerCase(), ...allExpandedTerms.slice(1, 5)]
          : allExpandedTerms;
      } else {
        expandedSearchTerms = [trimmedSearchTerm.toLowerCase()];
      }

      const queryLength = trimmedSearchTerm.length;
      const commonTerms = ['data', 'ai', 'web', 'app', 'code', 'tech', 'dev', 'cloud', 'api'];
      const isCommonTerm = commonTerms.includes(trimmedSearchTerm.toLowerCase());
      const useTagSearch = queryLength >= 3 && !isCommonTerm;
      const useOrganizerSearch = queryLength > 10 && !isCommonTerm;

      const searchTasks: Array<{ source: 'tag' | 'organizer'; promise: Promise<string[]> }> = [];

      if (useTagSearch) {
        expandedSearchTerms.forEach((term) => {
          const tagSearchPromise = EventService.getEventIdsByTagSearch(term, supabase, eventFilters);
          const timeoutPromise = new Promise<string[]>((resolve) => {
            setTimeout(() => {
              console.warn(`[PERF] Tag search timeout for term: ${term}`);
              resolve([]);
            }, 1000);
          });
          searchTasks.push({ source: 'tag', promise: Promise.race([tagSearchPromise, timeoutPromise]) });
        });
      }

      if (useOrganizerSearch) {
        expandedSearchTerms.forEach((term) => {
          const organizerSearchPromise = EventService.getEventIdsByOrganizerSearch(term, supabase);
          const timeoutPromise = new Promise<string[]>((resolve) => {
            setTimeout(() => {
              console.warn(`[PERF] Organizer search timeout for term: ${term}`);
              resolve([]);
            }, 1000);
          });
          searchTasks.push({ source: 'organizer', promise: Promise.race([organizerSearchPromise, timeoutPromise]) });
        });
      }

      const results = searchTasks.length > 0
        ? await Promise.all(searchTasks.map((task) => task.promise))
        : [];

      const tagResults: string[][] = [];
      const organizerResults: string[][] = [];
      results.forEach((ids, index) => {
        const source = searchTasks[index]?.source;
        if (source === 'tag') {
          tagResults.push(ids);
        } else if (source === 'organizer') {
          organizerResults.push(ids);
        }
      });

      tagMatchedEventIds = tagResults.length > 0 ? [...new Set(tagResults.flat())] : [];
      organizerMatchedEventIds = organizerResults.length > 0 ? [...new Set(organizerResults.flat())] : [];
    } catch (error) {
      console.error('[FilteredEventsService] Multi-field search error:', error);
    }
  }

  const additionalEventIds = [
    ...tagMatchedEventIds,
    ...organizerMatchedEventIds,
  ];

  if (additionalEventIds.length > 0) {
    const existingIds = eventFilters.eventIds || [];
    if (request.tags.length > 0 && existingIds.length > 0) {
      const additionalIdSet = new Set(additionalEventIds);
      eventFilters.eventIds = existingIds.filter((id) => additionalIdSet.has(id));
    } else {
      eventFilters.eventIds = [...new Set([...existingIds, ...additionalEventIds])];
    }
  }

  let filteredEvents;
  let totalEvents;
  let isColdStart;
  let candidateSources;
  let fetchedAllRecommendedCandidates = true;
  let retrievalStrategy: 'filtered-only' | 'hybrid-best-match-v1' = 'filtered-only';
  let candidateCounts: BestMatchCandidateCounts = {
    broad: 0,
    personalizedRaw: 0,
    personalizedFiltered: 0,
    merged: 0,
  };
  let supplemented = false;
  try {
    if (request.recommended) {
      const result = await fetchRecommendedCandidateWindow({
        filters: eventFilters,
        supabase,
        careerProfile,
        userId,
        telemetry,
        skipColdStart,
        page: request.page,
        pageSize: request.pageSize,
        useHybridBestMatch: shouldUseHybridBestMatch,
      });

      filteredEvents = result.events;
      totalEvents = result.totalCount;
      isColdStart = result.isColdStart;
      candidateSources = result.candidateSources;
      fetchedAllRecommendedCandidates = result.fetchedAllCandidates;
      retrievalStrategy = result.retrievalStrategy;
      candidateCounts = result.candidateCounts;
      supplemented = result.supplemented;
    } else if (shouldUseHybridBestMatch) {
      const result = await fetchHybridBestMatchCandidates({
        filters: eventFilters,
        supabaseClient: supabase,
        careerProfile,
        userId,
        page: fetchPage,
        pageSize: fetchPageSize,
        telemetry,
        skipColdStart,
      });

      filteredEvents = result.events;
      totalEvents = result.totalCount;
      isColdStart = result.isColdStart;
      candidateSources = result.candidateSources;
      fetchedAllRecommendedCandidates = true;
      retrievalStrategy = result.retrievalStrategy;
      candidateCounts = result.candidateCounts;
      supplemented = result.supplemented;
    } else {
      const result = await fetchFilteredRecommendationCandidates({
        filters: eventFilters,
        supabaseClient: supabase,
        careerProfile,
        userId,
        page: fetchPage,
        pageSize: fetchPageSize,
        telemetry,
        skipColdStart,
      });

      filteredEvents = result.events;
      totalEvents = result.totalCount;
      isColdStart = result.isColdStart;
      candidateSources = result.candidateSources;
      fetchedAllRecommendedCandidates = true;
      retrievalStrategy = 'filtered-only';
      candidateCounts = {
        broad: result.events.length,
        personalizedRaw: 0,
        personalizedFiltered: 0,
        merged: result.events.length,
      };
      supplemented = false;
    }
  } catch (error) {
    console.error('[FilteredEventsService] All event fetching methods failed:', error);
    throw error;
  }

  const enrichMaxPageEnv = process.env.ENRICH_MAX_PAGE ? parseInt(process.env.ENRICH_MAX_PAGE, 10) : Number.NaN;
  const enrichMaxPage = Number.isFinite(enrichMaxPageEnv) && enrichMaxPageEnv > 0
    ? enrichMaxPageEnv
    : Number.MAX_SAFE_INTEGER;

  const hasOnlySearchTerm = Boolean(request.rawSearchTerm)
    && request.categories.length === 0
    && request.tags.length === 0
    && request.locations.length === 0
    && request.format === 'all'
    && request.budget === 'all'
    && request.cost === 'all'
    && request.difficulty === 'all'
    && !request.dateRange?.start
    && !request.dateRange?.end
    && request.popularity === 'all'
    && request.duration === 'all'
    && !request.myNetwork
    && !request.recommended
    && request.sortBy !== 'career-impact';

  const shouldEnrich = !request.fastSearch && (
    request.recommended
    || isCareerImpactSort
    || (request.page <= enrichMaxPage && !hasOnlySearchTerm)
    || (request.surface === 'discover' && !hasOnlySearchTerm)
  );

  let enrichedEvents;
  try {
    if (!shouldEnrich) {
      enrichedEvents = filteredEvents;
    } else {
      enrichedEvents = await rankEventsWithRecommendationPipeline({
        events: filteredEvents,
        careerProfile,
        supabaseClient: supabase,
        userId,
        userLocation,
        applyDiversityEnhancement: false,
        allowRerank: isCareerImpactSort,
        sortByCareerImpact: isCareerImpactSort,
        careerImpactSortDirection: request.sortDirection,
        candidateSources,
      });
    }
  } catch (error) {
    console.error('[FilteredEventsService] Error enriching events with career impact:', error);
    enrichedEvents = filteredEvents;
  }

  if (request.recommended) {
    const recommendedEvents = enrichedEvents.filter(
      (event) => getRecommendedThresholdScore(event) >= RECOMMENDATION_THRESHOLDS.RECOMMENDED
    );
    const startIndex = (request.page - 1) * request.pageSize;
    const endIndex = startIndex + request.pageSize;
    const hasMoreRecommendedEvents = fetchedAllRecommendedCandidates
      ? endIndex < recommendedEvents.length
      : recommendedEvents.length > endIndex || totalEvents > filteredEvents.length;

    totalEvents = fetchedAllRecommendedCandidates
      ? recommendedEvents.length
      : hasMoreRecommendedEvents
        ? Math.max(recommendedEvents.length, endIndex + 1)
        : recommendedEvents.length;

    enrichedEvents = recommendedEvents.slice(startIndex, endIndex);
  } else if (isCareerImpactSort && fetchWindowMultiplier > 1) {
    const startIndex = (request.page - 1) * request.pageSize;
    const endIndex = startIndex + request.pageSize;
    enrichedEvents = enrichedEvents.slice(startIndex, endIndex);

    if (filteredEvents.length < fetchPageSize) {
      totalEvents = startIndex + enrichedEvents.length;
    } else {
      totalEvents = Math.max(totalEvents, startIndex + enrichedEvents.length);
    }
  }

  const counts = request.fastSearch ? null : await EventService.getFilterCounts(eventFilters, supabase);
  const availableFilters = request.fastSearch
    ? {
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
        locations: [],
      }
    : {
        categories: (await getAvailableCategories(supabase)).map((category) => ({
          ...category,
          count: counts?.categories[category.id] || 0,
        })),
        difficulties: [
          { value: 'beginner', count: 0 },
          { value: 'intermediate', count: 0 },
          { value: 'advanced', count: 0 },
        ],
        formats: [
          { value: 'virtual', count: counts?.format.virtual || 0 },
          { value: 'in-person', count: counts?.format['in-person'] || 0 },
          { value: 'hybrid', count: counts?.format.hybrid || 0 },
        ],
        locations: [],
      };

  const processingTime = Date.now() - startTime;

  logger.debug('[PERF] Request summary:', {
    requestId,
    processingTimeMs: processingTime,
    fastSearch: request.fastSearch,
    retrievalStrategy,
    candidateCounts,
    supplemented,
    filtersApplied: {
      hasSearch: Boolean(request.rawSearchTerm),
      categoriesCount: request.categories.length,
      tagsCount: request.tags.length,
      locationsCount: request.locations.length,
      format: request.format !== 'all' ? request.format : null,
      budget: request.budget !== 'all' ? request.budget : null,
      cost: request.cost !== 'all' ? request.cost : null,
      difficulty: request.difficulty !== 'all' ? request.difficulty : null,
      isRecommended: request.recommended,
      sortBy: request.sortBy,
    },
    results: {
      returned: enrichedEvents.length,
      total: totalEvents,
      isColdStart,
    },
  });

  return {
    events: enrichedEvents,
    pagination: {
      page: request.page,
      pageSize: request.pageSize,
      total: totalEvents,
      hasMore: request.page * request.pageSize < totalEvents,
    },
    filters: {
      applied: {
        searchTerm: request.rawSearchTerm,
        categories: request.categories,
        tags: request.tags,
        locations: request.rawLocations,
        format: request.format,
        cost: request.cost,
        difficulty: request.difficulty,
        dateRange: request.dateRange,
        sortBy: request.sortBy,
      },
      available: availableFilters,
    },
    stats: {
      processingTimeMs: processingTime,
      filteredCount: enrichedEvents.length,
      totalCount: totalEvents,
    },
    isColdStart,
    counts: counts ?? undefined,
  };
}

async function getAvailableCategories(
  supabase: SupabaseClientType
): Promise<Array<{ id: string; name: string; count: number }>> {
  try {
    const { data } = await supabase
      .from('event_type')
      .select('id, name')
      .order('name');

    return (data || [])
      .filter((item) => item.name)
      .map((item) => ({
        id: item.id,
        name: item.name!,
        count: 0,
      }));
  } catch {
    return [];
  }
}
