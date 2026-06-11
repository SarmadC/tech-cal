import {
  mobileDiscoverCostSchema,
  mobileDiscoverFeedRequestSchema,
  mobileDiscoverFormatSchema,
  mobileDiscoverRankingModeSchema,
  type MobileDiscoverFeedRequest,
  type MobileDiscoverRankingMode,
} from '@kurecal/domain';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { loadEngagementMap } from '@/app/api/mobile/engagement';
import { selectSharedTopPickEvents } from '@/app/api/mobile/recommendations/topPicks';
import { buildDiscoverFeed, toMobileEventCard } from '@/app/api/mobile/serializers';
import { normalizeDisplayScore } from '@/lib/recommendation/displayScore';
import { CareerProfileService } from '@/services/careerProfileService';
import {
  buildUserLocationFromProfileContext,
  loadFilteredEventsData,
  normalizeFilteredEventsRequest,
} from '@/services/filteredEventsService';
import type { Event } from '@/types';
import type { RecommendationMetadata } from '@/types/events';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

const DEFAULT_PAGE_SIZE = 24;

function readList(searchParams: URLSearchParams, key: string): string[] {
  return searchParams
    .getAll(key)
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseRankingMode(
  rawValue: string | null
): MobileDiscoverRankingMode | undefined {
  if (!rawValue?.trim()) {
    return undefined;
  }

  return mobileDiscoverRankingModeSchema.parse(rawValue.trim());
}

function parseFormat(rawValue: string | null) {
  if (!rawValue?.trim()) {
    return undefined;
  }

  return mobileDiscoverFormatSchema.parse(rawValue.trim());
}

function parseCost(rawValue: string | null) {
  if (!rawValue?.trim()) {
    return undefined;
  }

  return mobileDiscoverCostSchema.parse(rawValue.trim());
}

function parseDateValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function inputFromSearchParams(
  searchParams: URLSearchParams
): MobileDiscoverFeedRequest {
  const rawPage = searchParams.get('page');
  const parsedPage = rawPage ? Number(rawPage) : undefined;
  const dateStart =
    parseDateValue(searchParams.get('dateStart')) ??
    parseDateValue(searchParams.get('dateRangeStart'));
  const dateEnd =
    parseDateValue(searchParams.get('dateEnd')) ??
    parseDateValue(searchParams.get('dateRangeEnd'));

  return {
    rankingMode: parseRankingMode(
      searchParams.get('rankingMode') ?? searchParams.get('mode')
    ),
    searchTerm: searchParams.get('searchTerm') ?? undefined,
    categories: readList(searchParams, 'categories'),
    tags: readList(searchParams, 'tags'),
    location: searchParams.get('location'),
    dateRange:
      dateStart || dateEnd
        ? {
            start: dateStart,
            end: dateEnd,
          }
        : undefined,
    format: parseFormat(searchParams.get('format')),
    cost: parseCost(searchParams.get('cost')),
    page:
      typeof parsedPage === 'number' && Number.isFinite(parsedPage)
        ? parsedPage
        : undefined,
  };
}

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
  const dateRange = {
    start: parsed.dateRange?.start?.trim() || null,
    end: parsed.dateRange?.end?.trim() || null,
  };

  if (dateRange.start && dateRange.end && dateRange.end < dateRange.start) {
    throw new Error('dateRange end must be on or after start');
  }

  return {
    rankingMode: parsed.rankingMode ?? 'best-match',
    searchTerm: parsed.searchTerm?.trim() ?? '',
    categories: parsed.categories ?? [],
    tags: parsed.tags ?? [],
    location: parsed.location?.trim() ? parsed.location.trim() : null,
    dateRange,
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

  if (
    normalized.includes('preferred event type') ||
    normalized.includes('learning style')
  ) {
    return 'Fits your style';
  }

  return null;
}

function buildBestMatchInsight(metadata: RecommendationMetadata | null | undefined) {
  const mappedReason = metadata?.reasons
    ?.map((reason) => mapRecommendationReason(reason))
    .find((reason): reason is NonNullable<ReturnType<typeof mapRecommendationReason>> =>
      Boolean(reason)
    );

  if (mappedReason) {
    return mappedReason;
  }

  const score = normalizeDisplayScore(
    metadata?.alignmentScore ?? metadata?.matchScore ?? null
  );
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

async function handleDiscover(
  request: Request,
  input?: MobileDiscoverFeedRequest
) {
  const authContext = await getAuthenticatedRequestContext(request as never);
  if (!authContext) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const discoverInput = normalizeDiscoverPayload(input);
    const rankingFilters = resolveRankingFilters(discoverInput.rankingMode);

    const [careerProfile, profileContext] = await Promise.all([
      CareerProfileService.getCareerProfile(
        authContext.user.id,
        authContext.supabase
      ).catch(() => null),
      (async () => {
        try {
          const { data } = await authContext.supabase
            .from('profiles')
            .select('preferences, timezone, location')
            .eq('id', authContext.user.id)
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
      supabase: authContext.supabase,
      userId: authContext.user.id,
      careerProfile,
      userLocation: buildUserLocationFromProfileContext(
        profileContext,
        request.headers.get('x-timezone')
      ),
      requestId: 'mobile-discover',
      skipColdStart: false,
    });

    const engagementMap = await loadEngagementMap(
      authContext.supabase,
      authContext.user.id,
      data.events.map((event) => event.id)
    );

    const serializeEvent = (event: Event) =>
      toMobileEventCard(event, {
        engagement: engagementMap.get(event.id),
        insight: buildDiscoverInsight(
          event.recommendationMetadata,
          discoverInput.rankingMode
        ),
      });

    const shouldShowTopPicks =
      discoverInput.rankingMode === 'best-match' &&
      discoverInput.page === 1 &&
      !hasActiveDiscoverFilters(discoverInput) &&
      Boolean(careerProfile);

    const topPickEvents = shouldShowTopPicks ? selectSharedTopPickEvents(data.events) : [];
    const topPickIds = new Set(topPickEvents.map((event) => event.id));
    const feedEvents =
      topPickIds.size > 0
        ? data.events.filter((event) => !topPickIds.has(event.id))
        : data.events;
    const cards = feedEvents.map(serializeEvent);
    const topPickCards = topPickEvents.map(serializeEvent);

    return NextResponse.json({
      success: true,
      data: buildDiscoverFeed({
        rankingMode: discoverInput.rankingMode,
        request: {
          searchTerm: discoverInput.searchTerm,
          categories: discoverInput.categories,
          tags: discoverInput.tags,
          location: discoverInput.location,
          dateRange: discoverInput.dateRange,
          format: discoverInput.format,
          cost: discoverInput.cost,
        },
        data,
        topPicks:
          topPickCards.length > 0
            ? {
                title: 'Your Top Picks',
                cards: topPickCards,
              }
            : null,
        events: cards,
      }),
    });
  } catch (error) {
    const message =
      error instanceof ZodError
        ? 'Invalid discover request'
        : error instanceof Error
          ? error.message
          : 'Failed to load discovery';

    return NextResponse.json(
      { success: false, error: message },
      {
        status:
          error instanceof ZodError || message.startsWith('dateRange')
            ? 400
            : 500,
      }
    );
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  return handleDiscover(request, inputFromSearchParams(url.searchParams));
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => undefined)) as
    | MobileDiscoverFeedRequest
    | undefined;

  return handleDiscover(request, body);
}
