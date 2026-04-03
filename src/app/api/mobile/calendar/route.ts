import {
  mobileCalendarFeedRequestSchema,
  type LocalCalendarDateKey,
  type MobileCalendarDaySummary,
  type MobileCalendarFeedRequest,
} from '@kurecal/domain';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { loadEngagementMap } from '@/app/api/mobile/engagement';
import {
  buildCalendarFeed,
  toMobileCalendarEvent,
} from '@/app/api/mobile/serializers';
import { EventService } from '@/services/eventServices';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}

function formatLocalDateKey(date: Date): LocalCalendarDateKey {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function formatDateKeyInTimezone(
  date: Date,
  timeZone?: string | null
): LocalCalendarDateKey {
  if (timeZone?.trim()) {
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone,
      }).formatToParts(date);

      const year = parts.find((part) => part.type === 'year')?.value;
      const month = parts.find((part) => part.type === 'month')?.value;
      const day = parts.find((part) => part.type === 'day')?.value;

      if (year && month && day) {
        return `${year}-${month}-${day}`;
      }
    } catch {
      // Fall back to local time when the timezone is invalid.
    }
  }

  return formatLocalDateKey(date);
}

function parseLocalDateKey(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function resolveCurrentMonthStart(): LocalCalendarDateKey {
  const now = new Date();
  return formatLocalDateKey(new Date(now.getFullYear(), now.getMonth(), 1));
}

function resolveMonthEnd(monthStart: LocalCalendarDateKey): LocalCalendarDateKey {
  const date = parseLocalDateKey(monthStart);
  return formatLocalDateKey(
    new Date(date.getFullYear(), date.getMonth() + 1, 0)
  );
}

function normalizeCalendarInput(
  input: MobileCalendarFeedRequest | undefined
): { monthStart: LocalCalendarDateKey } {
  const parsed = mobileCalendarFeedRequestSchema.parse(input ?? {});

  return {
    monthStart: parsed.monthStart ?? resolveCurrentMonthStart(),
  };
}

function inputFromSearchParams(
  searchParams: URLSearchParams
): MobileCalendarFeedRequest {
  return {
    monthStart: searchParams.get('monthStart') ?? undefined,
  };
}

function buildGridDays(
  monthStart: LocalCalendarDateKey,
  today: LocalCalendarDateKey,
  countsByDate: Map<
    LocalCalendarDateKey,
    { eventCount: number; savedCount: number; attendingCount: number }
  >
): MobileCalendarDaySummary[] {
  const currentMonth = parseLocalDateKey(monthStart);
  const firstDay = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  );
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);

    const dateKey = formatLocalDateKey(date);
    const counts = countsByDate.get(dateKey) ?? {
      eventCount: 0,
      savedCount: 0,
      attendingCount: 0,
    };

    return {
      dateKey,
      dayNumber: date.getDate(),
      inCurrentMonth: date.getMonth() === currentMonth.getMonth(),
      isToday: dateKey === today,
      eventCount: counts.eventCount,
      savedCount: counts.savedCount,
      attendingCount: counts.attendingCount,
    };
  });
}

async function handleCalendar(
  request: Request,
  input: MobileCalendarFeedRequest | undefined
) {
  const authContext = await getAuthenticatedRequestContext(request as never);
  if (!authContext) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  const calendarInput = normalizeCalendarInput(input);
  const monthEnd = resolveMonthEnd(calendarInput.monthStart);
  const startDate = new Date(`${calendarInput.monthStart}T00:00:00.000Z`);
  const endDate = new Date(`${monthEnd}T23:59:59.999Z`);
  const today = formatDateKeyInTimezone(
    new Date(),
    request.headers.get('x-timezone')
  );

  const events = await EventService.getCalendarEvents(authContext.supabase, {
    startDate,
    endDate,
    limit: 600,
  });
  const engagementMap = await loadEngagementMap(
    authContext.supabase,
    authContext.user.id,
    events.map((event) => event.id)
  );

  const calendarEvents = events
    .map((event) => toMobileCalendarEvent(event, engagementMap.get(event.id)))
    .sort(
      (left, right) =>
        new Date(left.startTime).getTime() - new Date(right.startTime).getTime()
    );

  const countsByDate = new Map<
    LocalCalendarDateKey,
    { eventCount: number; savedCount: number; attendingCount: number }
  >();

  for (const event of calendarEvents) {
    const current = countsByDate.get(event.dateKey) ?? {
      eventCount: 0,
      savedCount: 0,
      attendingCount: 0,
    };

    current.eventCount += 1;
    if (event.engagement?.isBookmarked) {
      current.savedCount += 1;
    }
    if (event.engagement?.status === 'attending') {
      current.attendingCount += 1;
    }

    countsByDate.set(event.dateKey, current);
  }

  const savedCount = calendarEvents.filter(
    (event) => event.engagement?.isBookmarked
  ).length;
  const attendingCount = calendarEvents.filter(
    (event) => event.engagement?.status === 'attending'
  ).length;

  return NextResponse.json({
    success: true,
    data: buildCalendarFeed({
      header: {
        eyebrow: 'Calendar',
        title: 'Plan your month',
        subtitle:
          calendarEvents.length > 0
            ? `${calendarEvents.length} events across ${new Date(`${calendarInput.monthStart}T12:00:00.000Z`).toLocaleDateString(undefined, {
                month: 'long',
              })}`
            : 'A month-first view for the events you are tracking and exploring',
      },
      monthStart: calendarInput.monthStart,
      monthEnd,
      today,
      days: buildGridDays(calendarInput.monthStart, today, countsByDate),
      events: calendarEvents,
      totalCount: calendarEvents.length,
      savedCount,
      attendingCount,
    }),
  });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    return await handleCalendar(request, inputFromSearchParams(url.searchParams));
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load calendar feed',
      },
      { status: error instanceof ZodError ? 400 : 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => undefined)) as
      | MobileCalendarFeedRequest
      | undefined;

    return await handleCalendar(request, body);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load calendar feed',
      },
      { status: error instanceof ZodError ? 400 : 500 }
    );
  }
}
