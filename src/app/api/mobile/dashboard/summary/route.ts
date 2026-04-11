import { NextResponse } from 'next/server';

import {
  engagementFromTrackedEvent,
  loadEngagementMap,
} from '@/app/api/mobile/engagement';
import {
  buildDashboardCareerImpact,
  buildDashboardCareerOutcomes,
  buildDiscoveryBreadth,
  buildDashboardInsights,
  buildDashboardPerformance,
  buildEngagementStreak,
  buildMonthlyPulse,
  buildNetworkPulse,
  buildPredictionAccuracy,
  buildTopRecommendation,
  buildUpcomingCommitments,
} from '@/app/api/mobile/dashboard/summary/dashboardMetrics';
import {
  buildDashboardSummary,
  toMobileEventCard,
  toMobileEventSummary,
  trackedRecordToEventCard,
} from '@/app/api/mobile/serializers';
import { CareerProfileService } from '@/services/careerProfileService';
import { EventService } from '@/services/eventServices';
import { EventFeedbackService } from '@/services/eventFeedbackService';
import { ProfileService } from '@/services/profileService';
import { fetchPersonalizedRecommendationCandidates } from '@/services/recommendations/recommendationPipeline';
import { UserEventService } from '@/services/userEventService';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

const DASHBOARD_CARD_LIMIT = 3;
const DASHBOARD_RECOMMENDATION_POOL = 12;

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

    const [trackedEvents, careerProfile, profile, feedbackList] = await Promise.all([
      UserEventService.getTrackedEvents(authContext.user.id, authContext.supabase),
      CareerProfileService.getCareerProfile(
        authContext.user.id,
        authContext.supabase
      ),
      ProfileService.getProfile(authContext.user.id, authContext.supabase).catch(
        () => null
      ),
      EventFeedbackService.getAllFeedbackForUser(
        authContext.user.id,
        authContext.supabase
      ).catch(() => []),
    ]);
    const nowDate = new Date(now);
    const feedbackByEventId = new Map(
      feedbackList.map((item) => [item.eventId, item] as const)
    );

    const recommendedEvents = careerProfile
      ? (
          await fetchPersonalizedRecommendationCandidates({
            supabaseClient: authContext.supabase,
            userId: authContext.user.id,
            careerProfile,
            limit: DASHBOARD_RECOMMENDATION_POOL,
          })
        ).events
      : await EventService.getEvents(
          {
            startDate: new Date(now),
            status: ['confirmed'],
            sortBy: 'date',
            sortDirection: 'asc',
          },
          authContext.supabase,
          1,
          DASHBOARD_RECOMMENDATION_POOL
        );

    const upcomingTrackedEvents = trackedEvents
      .filter((record) => record.event && isUpcoming(record.event.startTime, now))
      .sort(
        (left, right) =>
          new Date(left.event?.startTime ?? 0).getTime() -
          new Date(right.event?.startTime ?? 0).getTime()
      );

    const engagementMap = await loadEngagementMap(
      authContext.supabase,
      authContext.user.id,
      recommendedEvents.map((event) => event.id)
    );

    const upcomingCards = upcomingTrackedEvents
      .slice(0, DASHBOARD_CARD_LIMIT)
      .map((record) => trackedRecordToEventCard(record))
      .filter((card): card is NonNullable<typeof card> => Boolean(card));

    const legacyUpcomingEvents = upcomingTrackedEvents
      .slice(0, DASHBOARD_CARD_LIMIT)
      .map((record) =>
        toMobileEventSummary(record.event!, engagementFromTrackedEvent(record))
      );

    const recommendedCards = recommendedEvents.map((event) =>
      toMobileEventCard(event, {
        engagement: engagementMap.get(event.id),
        insight:
          event.recommendationMetadata?.alignmentScore != null
            ? `Alignment ${Math.round(event.recommendationMetadata.alignmentScore)}`
            : 'Fresh recommendation',
      })
    );

    const topRecommendation = buildTopRecommendation({
      recommendationCards: recommendedCards,
      recommendedEvents,
      now: nowDate,
    });

    const { commitments, showOpenSlot } = buildUpcomingCommitments({
      trackedEvents,
      now: nowDate,
      toSummary: (event, record) =>
        toMobileEventSummary(event, engagementFromTrackedEvent(record)),
    });

    const insights = buildDashboardInsights({
      trackedEvents,
      careerProfile,
      now: nowDate,
    });

    const monthlyPulse = buildMonthlyPulse({
      trackedEvents,
      now: nowDate,
    });

    const performance = buildDashboardPerformance({
      trackedEvents,
      careerProfile,
      feedbackByEventId,
      feedbackList,
      now: nowDate,
      toSummary: (event, record) =>
        toMobileEventSummary(event, engagementFromTrackedEvent(record)),
    });

    const engagementStreak = buildEngagementStreak({
      trackedEvents,
      now: nowDate,
    });

    const discoveryBreadth = buildDiscoveryBreadth({
      trackedEvents,
      now: nowDate,
    });

    const careerImpact = buildDashboardCareerImpact({
      trackedEvents,
      careerProfile,
      now: nowDate,
    });

    const careerOutcomes = buildDashboardCareerOutcomes({
      trackedEvents,
      feedbackList,
      now: nowDate,
      toSummary: (event, record) =>
        toMobileEventSummary(event, engagementFromTrackedEvent(record)),
    });

    const networkPulse = buildNetworkPulse({
      trackedEvents,
      feedbackList,
      now: nowDate,
    });

    const predictionAccuracy = buildPredictionAccuracy({
      feedbackList,
    });

    const legacyRecommendedEvents = recommendedEvents.map((event) =>
      toMobileEventSummary(event, engagementMap.get(event.id))
    );

    const summary = buildDashboardSummary({
      hasCompletedOnboarding: Boolean(careerProfile),
      profileHasCompletedOnboarding: Boolean(
        (
          profile?.preferences as Record<string, unknown> | null | undefined
        )?.careerOnboardingCompleted
      ),
      trackedCount: trackedEvents.length,
      savedCount: trackedEvents.filter((record) => record.isBookmarked).length,
      attendingCount: trackedEvents.filter(
        (record) => record.status === 'attending'
      ).length,
      recommendationCards: recommendedCards,
      upcomingCards,
      topRecommendation,
      upcomingCommitments: commitments,
      showOpenCommitmentSlot: showOpenSlot,
      insights,
      monthlyPulse,
      performance,
      engagementStreak,
      discoveryBreadth,
      networkPulse,
      predictionAccuracy,
      careerImpact,
      careerOutcomes,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...summary,
        // Keep the legacy Phase 2 fields temporarily so stale dev-client bundles
        // can keep loading while the restored dashboard UI rolls out.
        header: {
          eyebrow: 'Dashboard',
          title: 'Your event runway',
          subtitle: 'Upcoming plans, saved events, and fresh openings',
        },
        upcomingCount: legacyUpcomingEvents.length,
        savedCount: trackedEvents.filter((record) => record.isBookmarked).length,
        recommendationCount: legacyRecommendedEvents.length,
        heroEvent: legacyUpcomingEvents[0] ?? legacyRecommendedEvents[0] ?? null,
        upcomingEvents: legacyUpcomingEvents,
        recommendedEvents: legacyRecommendedEvents,
      },
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
