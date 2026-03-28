import {
  mobileDiscoverFeedRequestSchema,
  mobileDiscoverRankingModeSchema,
  type MobileDiscoverFeedRequest,
  type MobileDiscoverRankingMode,
} from '@kurecal/domain';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getApiAuthContext } from '@/lib/apiAuth';
import { CareerProfileService } from '@/services/careerProfileService';
import {
  buildUserLocationFromProfileContext,
  loadFilteredEventsData,
  normalizeFilteredEventsRequest,
} from '@/services/filteredEventsService';
import { loadEngagementMap } from '@/app/api/mobile/engagement';
import { buildDiscoverFeed, toMobileEventCard } from '@/app/api/mobile/serializers';
import { selectTopPickEvents } from '@/components/discovery/discoveryRanking';
import type { RecommendationMetadata } from '@/types/events';

const DEFAULT_PAGE_SIZE = 24;

function resolveRankingFilters(rankingMode: MobileDiscoverRankingMode) {
  if (rankingMode === 'trending') {
    return {
      sortBy: 'popularity' as const,
      sortDirection: 'desc' as const,
      popularity: 'trending' as const,
    };
  }

  if (rankingMode === 'soonest') {
    return {
      sortBy: 'date' as const,
      sortDirection: 'asc' as const,
      popularity: 'all' as const,
    };
  }

  return {
    sortBy: 'career-impact' as const,
    sortDirection: 'desc' as const,
    popularity: 'all' as const,
  };
}

function normalizeDiscoverPayload(input: MobileDiscoverFeedRequest | undefined) {
  const parsed = mobileDiscoverFeedRequestSchema.parse(input ?? {});
  const rankingMode = parsed.rankingMode ?? 'best-match';

  return {
    rankingMode,
    searchTerm: parsed.searchTerm?.trim() ?? '',
    categories: parsed.categories ?? [],
    tags: parsed.tags ?? [],
    location: parsed.location?.trim() ? parsed.location.trim() : null,
    dateRange: {
      start: parsed.dateRange?.start ?? null,
      end: parsed.dateRange?.end ?? null,
    },
    format: parsed.format ?? 'all',
    cost: parsed.cost ?? 'all',
    page: parsed.page ?? 1,
  };
}

function hasActiveDiscoverFilters(
  input: ReturnType<typeof normalizeDiscoverPayload>
) {
  return Boolean(
    input.searchTerm.trim() ||
    input.categories.length > 0 ||
    input.tags.length > 0 ||
    input.location?.trim() ||
    input.dateRange.start ||
    input.dateRange.end ||
    input.format !== 'all' ||
    input.cost !== 'all'
  );
}

function mapRecommendationReason(reason: string) {
  const normalized = reason.toLowerCase();

  if (
    normalized.includes('goal') ||
    normalized.includes('leadership') ||
    normalized.includes('entrepreneur') ||
    normalized.includes('networking')
  ) {
    return 'Fits your goals';
  }

  if (
    normalized.includes('skill') ||
    normalized.includes('learning') ||
    normalized.includes('workshop') ||
    normalized.includes('deep-dive')
  ) {
    return 'Builds your skills';
  }

  if (normalized.includes('interest') || normalized.includes('topic')) {
    return 'Matches your interests';
  }

  if (normalized.includes('role')) {
    return 'Fits your role';
  }

  if (normalized.includes('seniority') || normalized.includes('level')) {
    return 'Fits your level';
  }

  if (
    normalized.includes('similar professional') ||
    normalized.includes('peer network') ||
    normalized.includes('popular with')
  ) {
    return 'Popular with peers';
  }

  if (normalized.includes('preferred event type') || normalized.includes('learning style')) {
    return 'Fits your style';
  }

  return null;
}

function buildBestMatchInsight(metadata: RecommendationMetadata | null | undefined) {
  const mappedReason = metadata?.reasons
    ?.map((reason) => mapRecommendationReason(reason))
    .find((reason): reason is NonNullable<ReturnType<typeof mapRecommendationReason>> => Boolean(reason));

  if (mappedReason) {
    return mappedReason;
  }

  const score = metadata?.alignmentScore ?? metadata?.matchScore ?? null;
  if (typeof score === 'number') {
    if (score >= 78) return 'Strong match';
    if (score >= 60) return 'Good fit';
    if (score >= 45) return 'Recommended';
  }

  return null;
}

function buildDiscoverInsight(
  metadata: RecommendationMetadata | null | undefined,
  rankingMode: MobileDiscoverRankingMode
) {
  if (rankingMode === 'best-match') {
    return buildBestMatchInsight(metadata);
  }

  if (rankingMode === 'trending') {
    return mapRecommendationReason(metadata?.reasons?.[0] ?? '') === 'Popular with peers'
      ? 'Popular with peers'
      : 'Popular right now';
  }

  return 'Happening soon';
}

async function loadDiscoverResponse(
  request: Request,
  input?: MobileDiscoverFeedRequest
) {
  const { supabase, user } = await getApiAuthContext(request);
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  const discoverInput = normalizeDiscoverPayload(input);
  const rankingFilters = resolveRankingFilters(discoverInput.rankingMode);

  const [careerProfile, profileContext] = await Promise.all([
    CareerProfileService.getCareerProfile(user.id, supabase).catch(() => null),
    (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('preferences, timezone, location')
          .eq('id', user.id)
          .single();

        return data ?? null;
      } catch {
        return null;
      }
    })(),
  ]);

  const normalizedRequest = normalizeFilteredEventsRequest({
    searchTerm: discoverInput.searchTerm,
    categories: discoverInput.categories,
    tags: discoverInput.tags,
    locations: discoverInput.location ? [discoverInput.location] : [],
    dateRange: {
      start: discoverInput.dateRange.start ?? undefined,
      end: discoverInput.dateRange.end ?? undefined,
    },
    format: discoverInput.format,
    cost: discoverInput.cost,
    page: discoverInput.page,
    pageSize: DEFAULT_PAGE_SIZE,
    surface: 'discover',
    ...rankingFilters,
  });

  const data = await loadFilteredEventsData({
    request: normalizedRequest,
    supabase,
    userId: user.id,
    careerProfile,
    userLocation: buildUserLocationFromProfileContext(profileContext, request.headers.get('x-timezone')),
    requestId: 'mobile-discover',
    skipColdStart: false,
  });

  const engagementMap = await loadEngagementMap(
    supabase,
    user.id,
    data.events.map((event) => event.id)
  );

  const serializeEvent = (event: (typeof data.events)[number]) =>
    toMobileEventCard(event, {
      engagement: engagementMap.get(event.id),
      insight: buildDiscoverInsight(event.recommendationMetadata, discoverInput.rankingMode),
    });

  const shouldShowTopPicks =
    discoverInput.rankingMode === 'best-match' &&
    discoverInput.page === 1 &&
    !hasActiveDiscoverFilters(discoverInput) &&
    Boolean(careerProfile);

  const topPickEvents = shouldShowTopPicks ? selectTopPickEvents(data.events) : [];
  const topPickIds = new Set(topPickEvents.map((event) => event.id));
  const feedEvents = topPickIds.size > 0
    ? data.events.filter((event) => !topPickIds.has(event.id))
    : data.events;
  const cards = feedEvents.map(serializeEvent);
  const topPickCards = topPickEvents.map(serializeEvent);

  return NextResponse.json({
    success: true,
    data: buildDiscoverFeed({
      rankingMode: discoverInput.rankingMode,
      request: discoverInput,
      data,
      topPicks: topPickCards.length > 0
        ? {
            title: 'Your Top Picks',
            cards: topPickCards,
          }
        : null,
      events: cards,
    }),
  });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const rankingMode = mobileDiscoverRankingModeSchema.catch('best-match').parse(
      url.searchParams.get('mode') ?? 'best-match'
    );

    return await loadDiscoverResponse(request, { rankingMode });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to load discovery' },
      { status: error instanceof ZodError ? 400 : 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as MobileDiscoverFeedRequest;
    return await loadDiscoverResponse(request, body);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to load discovery' },
      { status: error instanceof ZodError ? 400 : 500 }
    );
  }
}
