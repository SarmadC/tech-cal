import { NextResponse } from 'next/server';

import {
  engagementFromTrackedEvent,
  loadEngagementMap,
} from '@/app/api/mobile/engagement';
import {
  buildDashboardSummary,
  toMobileEventSummary,
} from '@/app/api/mobile/serializers';
import { EventService } from '@/services/eventServices';
import { UserEventService } from '@/services/userEventService';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

const DASHBOARD_CARD_LIMIT = 3;

function isUpcoming(startTime: string, now: number) {
  return new Date(startTime).getTime() >= now;
}

export async function GET(request: Request) {
  try {
    const authContext = await getAuthenticatedRequestContext(request as never);
    if (!authContext) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const now = Date.now();
    const recommendationFilters = {
      startDate: new Date(now),
      status: ['confirmed'],
      sortBy: 'date' as const,
      sortDirection: 'asc' as const,
    };

    const [trackedEvents, recommendedEvents, recommendationCount] = await Promise.all([
      UserEventService.getTrackedEvents(authContext.user.id, authContext.supabase),
      EventService.getEvents(
        recommendationFilters,
        authContext.supabase,
        1,
        DASHBOARD_CARD_LIMIT + 2
      ),
      EventService.getEventCount(recommendationFilters, authContext.supabase),
    ]);

    const upcomingTrackedEvents = trackedEvents
      .filter((record) => record.event && isUpcoming(record.event.startTime, now))
      .sort(
        (left, right) =>
          new Date(left.event?.startTime ?? 0).getTime() -
          new Date(right.event?.startTime ?? 0).getTime()
      );

    const trackedEventIds = new Set(
      upcomingTrackedEvents
        .map((record) => record.event?.id)
        .filter((eventId): eventId is string => Boolean(eventId))
    );

    const visibleRecommendedEvents = recommendedEvents
      .filter((event) => !trackedEventIds.has(event.id))
      .slice(0, DASHBOARD_CARD_LIMIT);

    const engagementMap = await loadEngagementMap(
      authContext.supabase,
      authContext.user.id,
      visibleRecommendedEvents.map((event) => event.id)
    );

    const upcomingCards = upcomingTrackedEvents
      .slice(0, DASHBOARD_CARD_LIMIT)
      .map((record) =>
        toMobileEventSummary(record.event!, engagementFromTrackedEvent(record))
      );

    const recommendedCards = visibleRecommendedEvents.map((event) =>
      toMobileEventSummary(event, engagementMap.get(event.id))
    );

    return NextResponse.json({
      success: true,
      data: buildDashboardSummary({
        header: {
          eyebrow: 'Dashboard',
          title: 'Your event runway',
          subtitle: 'Upcoming plans, saved events, and fresh openings',
        },
        upcomingCount: upcomingTrackedEvents.length,
        savedCount: trackedEvents.filter((record) => record.isBookmarked).length,
        recommendationCount,
        heroEvent: upcomingCards[0] ?? recommendedCards[0] ?? null,
        upcomingEvents: upcomingCards,
        recommendedEvents: recommendedCards,
      }),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load dashboard summary',
      },
      { status: 500 }
    );
  }
}
