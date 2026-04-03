import {
  mobileDiscoverFeedRequestSchema,
  type MobileDiscoverFeedRequest,
} from '@kurecal/domain';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { loadEngagementMap } from '@/app/api/mobile/engagement';
import {
  buildDiscoverFeed,
  toMobileEventSummary,
} from '@/app/api/mobile/serializers';
import { EventService } from '@/services/eventServices';
import type { EventFilters } from '@/types';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

const DISCOVER_PAGE_SIZE = 12;

function parseDateBoundary(
  value: string | null | undefined,
  endOfDay = false
): Date | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  const candidate = new Date(
    `${value.trim()}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`
  );

  if (Number.isNaN(candidate.getTime())) {
    throw new Error(`Invalid ${endOfDay ? 'dateTo' : 'dateFrom'} value`);
  }

  return candidate;
}

function normalizeDiscoverInput(
  input: MobileDiscoverFeedRequest | undefined
): Required<MobileDiscoverFeedRequest> {
  const parsed = mobileDiscoverFeedRequestSchema.parse(input ?? {});

  return {
    searchTerm: parsed.searchTerm?.trim() ?? '',
    categories: parsed.categories ?? [],
    tags: parsed.tags ?? [],
    location: parsed.location?.trim() ? parsed.location.trim() : null,
    dateFrom: parsed.dateFrom?.trim() || null,
    dateTo: parsed.dateTo?.trim() || null,
    page: parsed.page ?? 1,
  };
}

function readList(searchParams: URLSearchParams, key: string): string[] {
  return searchParams
    .getAll(key)
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean);
}

function inputFromSearchParams(searchParams: URLSearchParams): MobileDiscoverFeedRequest {
  const rawPage = searchParams.get('page');
  const parsedPage = rawPage ? Number(rawPage) : undefined;

  return {
    searchTerm: searchParams.get('searchTerm') ?? undefined,
    categories: readList(searchParams, 'categories'),
    tags: readList(searchParams, 'tags'),
    location: searchParams.get('location'),
    dateFrom: searchParams.get('dateFrom'),
    dateTo: searchParams.get('dateTo'),
    page:
      typeof parsedPage === 'number' && Number.isFinite(parsedPage)
        ? parsedPage
        : undefined,
  };
}

function buildDiscoverFilters(
  input: Required<MobileDiscoverFeedRequest>
): EventFilters {
  const startDate = parseDateBoundary(input.dateFrom) ?? new Date();
  const endDate = parseDateBoundary(input.dateTo, true);

  if (endDate && endDate.getTime() < startDate.getTime()) {
    throw new Error('dateTo must be on or after dateFrom');
  }

  return {
    searchTerm: input.searchTerm || undefined,
    categories: input.categories,
    tags: input.tags,
    locations: input.location ? [input.location] : [],
    startDate,
    endDate,
    status: ['confirmed'],
    sortBy: 'date',
    sortDirection: 'asc',
  };
}

function buildSubtitle(input: Required<MobileDiscoverFeedRequest>, totalCount: number) {
  if (input.searchTerm) {
    return `${totalCount} result${totalCount === 1 ? '' : 's'} for "${input.searchTerm}"`;
  }

  if (input.location) {
    return `Upcoming events near ${input.location}`;
  }

  if (input.tags.length > 0) {
    return `Tracking ${input.tags.length} tag${input.tags.length === 1 ? '' : 's'} this week`;
  }

  return 'Upcoming events curated for the mobile experience';
}

async function handleDiscover(
  request: Request,
  input: MobileDiscoverFeedRequest | undefined
) {
  const authContext = await getAuthenticatedRequestContext(request as never);
  if (!authContext) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const discoverInput = normalizeDiscoverInput(input);
    const filters = buildDiscoverFilters(discoverInput);

    const [events, totalCount] = await Promise.all([
      EventService.getEvents(
        filters,
        authContext.supabase,
        discoverInput.page,
        DISCOVER_PAGE_SIZE
      ),
      EventService.getEventCount(filters, authContext.supabase),
    ]);

    const engagementMap = await loadEngagementMap(
      authContext.supabase,
      authContext.user.id,
      events.map((event) => event.id)
    );

    return NextResponse.json({
      success: true,
      data: buildDiscoverFeed({
        header: {
          eyebrow: 'Discover',
          title: 'Find your next event',
          subtitle: buildSubtitle(discoverInput, totalCount),
        },
        events: events.map((event) =>
          toMobileEventSummary(event, engagementMap.get(event.id))
        ),
        page: discoverInput.page,
        pageSize: DISCOVER_PAGE_SIZE,
        totalCount,
      }),
    });
  } catch (error) {
    const message =
      error instanceof ZodError
        ? 'Invalid discover request'
        : error instanceof Error
          ? error.message
          : 'Failed to load discover feed';

    return NextResponse.json(
      {
        success: false,
        error: message,
        details: error instanceof ZodError ? error.issues : undefined,
      },
      { status: error instanceof ZodError || message.startsWith('Invalid') || message.startsWith('dateTo') ? 400 : 500 }
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
