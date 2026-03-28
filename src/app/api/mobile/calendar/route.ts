import {
  mobileCalendarFeedRequestSchema,
  type MobileCalendarFeedRequest,
} from '@kurecal/domain';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { loadEngagementMap } from '@/app/api/mobile/engagement';
import { buildCalendarFeed, toMobileCalendarEvent } from '@/app/api/mobile/serializers';
import { getApiAuthContext } from '@/lib/apiAuth';
import {
  buildUserLocationFromProfileContext,
  loadFilteredEventsData,
  normalizeFilteredEventsRequest,
} from '@/services/filteredEventsService';
import { EventTypeService } from '@/services/eventTypeService';

const DEFAULT_PAGE_SIZE = 100;

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function resolveCurrentMonthStart() {
  const now = new Date();
  return formatDateKey(new Date(now.getFullYear(), now.getMonth(), 1));
}

function resolveMonthEnd(monthStart: string) {
  const date = parseDateKey(monthStart);
  return formatDateKey(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

function normalizeCalendarPayload(input?: MobileCalendarFeedRequest) {
  const parsed = mobileCalendarFeedRequestSchema.parse(input ?? {});

  return {
    monthStart: parsed.monthStart ?? resolveCurrentMonthStart(),
    tags: parsed.tags ?? [],
    location: parsed.location?.trim() ? parsed.location.trim() : null,
    dateRange: {
      start: parsed.dateRange?.start ?? null,
      end: parsed.dateRange?.end ?? null,
    },
    cost: parsed.cost ?? 'all',
  };
}

function buildEffectiveDateRange(input: ReturnType<typeof normalizeCalendarPayload>) {
  const monthEnd = resolveMonthEnd(input.monthStart);
  const start = input.dateRange.start && input.dateRange.start > input.monthStart
    ? input.dateRange.start
    : input.monthStart;
  const end = input.dateRange.end && input.dateRange.end < monthEnd
    ? input.dateRange.end
    : monthEnd;

  return {
    monthEnd,
    start,
    end,
    hasOverlap: start <= end,
  };
}

async function loadCalendarResponse(request: Request, input?: MobileCalendarFeedRequest) {
  const { supabase, user } = await getApiAuthContext(request);
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  const calendarInput = normalizeCalendarPayload(input);
  const effectiveRange = buildEffectiveDateRange(calendarInput);

  const [profileContext, eventTypes] = await Promise.all([
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
    EventTypeService.getEventTypes(supabase).catch(() => []),
  ]);

  if (!effectiveRange.hasOverlap) {
    return NextResponse.json({
      success: true,
      data: buildCalendarFeed({
        monthStart: calendarInput.monthStart,
        monthEnd: effectiveRange.monthEnd,
        request: calendarInput,
        data: null,
        eventTypes,
        events: [],
      }),
    });
  }

  const baseRequest = normalizeFilteredEventsRequest({
    tags: calendarInput.tags,
    locations: calendarInput.location ? [calendarInput.location] : [],
    dateRange: {
      start: `${effectiveRange.start}T00:00:00.000`,
      end: `${effectiveRange.end}T23:59:59.999`,
    },
    cost: calendarInput.cost,
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    sortBy: 'date',
    sortDirection: 'asc',
    surface: 'calendar',
  });

  const userLocation = buildUserLocationFromProfileContext(
    profileContext,
    request.headers.get('x-timezone')
  );

  const firstPage = await loadFilteredEventsData({
    request: baseRequest,
    supabase,
    userId: user.id,
    careerProfile: null,
    userLocation,
    requestId: 'mobile-calendar',
    skipColdStart: false,
  });

  const allEvents = [...firstPage.events];
  let currentPage = 1;
  let hasMore = firstPage.pagination.hasMore;
  while (hasMore) {
    currentPage += 1;
    const nextData = await loadFilteredEventsData({
      request: {
        ...baseRequest,
        page: currentPage,
      },
      supabase,
      userId: user.id,
      careerProfile: null,
      userLocation,
      requestId: 'mobile-calendar',
      skipColdStart: false,
    });

    allEvents.push(...nextData.events);
    hasMore = nextData.pagination.hasMore;
  }

  const engagementMap = await loadEngagementMap(
    supabase,
    user.id,
    allEvents.map((event) => event.id)
  );

  const events = allEvents.map((event) =>
    toMobileCalendarEvent(event, {
      engagement: engagementMap.get(event.id),
    })
  );

  return NextResponse.json({
    success: true,
    data: buildCalendarFeed({
      monthStart: calendarInput.monthStart,
      monthEnd: effectiveRange.monthEnd,
      request: calendarInput,
      data: firstPage,
      eventTypes,
      events,
    }),
  });
}

export async function GET(request: Request) {
  try {
    return await loadCalendarResponse(request);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load calendar feed',
      },
      { status: error instanceof ZodError ? 400 : 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as MobileCalendarFeedRequest;
    return await loadCalendarResponse(request, body);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load calendar feed',
      },
      { status: error instanceof ZodError ? 400 : 500 }
    );
  }
}
