import type { MobileDashboardSummary } from '@kurecal/domain';
import * as Sentry from '@sentry/nextjs';

import {
  engagementFromTrackedEvent,
  loadEngagementMap,
} from '@/app/api/mobile/engagement';
import { selectSharedTopPickEvents } from '@/app/api/mobile/recommendations/topPicks';
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
} from '@/services/dashboard/dashboardMetrics';
import {
  buildDashboardSummary,
  toMobileEventCard,
  toMobileEventSummary,
  trackedRecordToEventCard,
} from '@/app/api/mobile/serializers';
import { CareerProfileService } from '@/services/careerProfileService';
import { EventService } from '@/services/eventServices';
import { EventFeedbackService } from '@/services/eventFeedbackService';
import { EventNetworkingSummaryService } from '@/services/eventNetworkingSummaryService';
import { PeerCohortService } from '@/services/peerCohortService';
import { extractRecommendationScore } from '@/lib/recommendation/displayScore';
import { buildUserLocationFromProfileContext } from '@/services/filteredEventsService';
import { ProfileService } from '@/services/profileService';
import {
  fetchPersonalizedRecommendationCandidates,
  rankEventsWithRecommendationPipeline,
} from '@/services/recommendations/recommendationPipeline';
import { UserNetworkingContactService } from '@/services/userNetworkingContactService';
import { UserEventService } from '@/services/userEventService';
import type { Event } from '@/types';
import type { SupabaseClientType } from '@/types/database';

const DASHBOARD_CARD_LIMIT = 3;
const DASHBOARD_RECOMMENDATION_POOL = 12;

function isUpcoming(startTime: string, now: number) {
  return new Date(startTime).getTime() >= now;
}

export interface DashboardSummaryLegacyMobileFields {
  header: {
    eyebrow: string;
    title: string;
    subtitle: string;
  };
  upcomingCount: number;
  savedCount: number;
  recommendationCount: number;
  heroEvent: ReturnType<typeof toMobileEventSummary> | null;
  upcomingEvents: Array<ReturnType<typeof toMobileEventSummary>>;
  recommendedEvents: Array<ReturnType<typeof toMobileEventSummary>>;
}

export interface BuildMobileDashboardSummaryParams {
  userId: string;
  supabase: SupabaseClientType;
  readClient: SupabaseClientType;
  now?: number;
}

export interface BuildMobileDashboardSummaryResult {
  summary: MobileDashboardSummary;
  legacyMobileFields: DashboardSummaryLegacyMobileFields;
}

export async function buildMobileDashboardSummaryForUser({
  userId,
  supabase,
  readClient,
  now = Date.now(),
}: BuildMobileDashboardSummaryParams): Promise<BuildMobileDashboardSummaryResult> {
  const [
    trackedEvents,
    careerProfile,
    profile,
    feedbackList,
    networkingSummaries,
    userNetworkingContacts,
  ] = await Promise.all([
    UserEventService.getTrackedEvents(userId, supabase),
    CareerProfileService.getCareerProfile(userId, supabase),
    ProfileService.getProfile(userId, supabase).catch((error) => {
      console.warn('[DashboardSummary] Failed to load profile, proceeding without it:', error);
      Sentry.captureException(error, { level: 'warning', extra: { function: 'buildMobileDashboardSummaryForUser', userId, step: 'getProfile' } });
      return null;
    }),
    EventFeedbackService.getAllFeedbackForUser(userId, supabase).catch((error) => {
      console.warn('[DashboardSummary] Failed to load feedback:', error);
      Sentry.captureException(error, { level: 'warning', extra: { function: 'buildMobileDashboardSummaryForUser', userId, step: 'getAllFeedback' } });
      return [];
    }),
    EventNetworkingSummaryService.getAllSummariesForUser(userId, supabase).catch(
      (error) => {
        console.warn('[DashboardSummary] Failed to load networking summaries:', error);
        Sentry.captureException(error, { level: 'warning', extra: { function: 'buildMobileDashboardSummaryForUser', userId, step: 'getAllSummaries' } });
        return [];
      }
    ),
    UserNetworkingContactService.getAllContactsForViewer(userId, supabase).catch(
      (error) => {
        console.warn('[DashboardSummary] Failed to load networking contacts:', error);
        Sentry.captureException(error, { level: 'warning', extra: { function: 'buildMobileDashboardSummaryForUser', userId, step: 'getAllContacts' } });
        return [];
      }
    ),
  ]);

  const nowDate = new Date(now);
  const hydratedNetworkingContacts =
    await UserNetworkingContactService.hydrateContacts(
      userNetworkingContacts,
      readClient
    ).catch((error) => {
      console.warn('[DashboardSummary] Failed to hydrate networking contacts:', error);
      Sentry.captureException(error, { level: 'warning', extra: { function: 'buildMobileDashboardSummaryForUser', userId, step: 'hydrateContacts' } });
      return [];
    });
  const feedbackByEventId = new Map(
    feedbackList.map((item) => [item.eventId, item] as const)
  );

  let recommendedEvents: Event[];
  if (careerProfile) {
    const candidates = await fetchPersonalizedRecommendationCandidates({
      supabaseClient: supabase,
      userId,
      careerProfile,
      limit: DASHBOARD_RECOMMENDATION_POOL,
    });

    try {
      recommendedEvents = await rankEventsWithRecommendationPipeline({
        events: candidates.events,
        careerProfile,
        supabaseClient: supabase,
        userId,
        userLocation: buildUserLocationFromProfileContext(profile),
        applyDiversityEnhancement: false,
        allowRerank: true,
        sortByCareerImpact: true,
        careerImpactSortDirection: 'desc',
        candidateSources: candidates.candidateSources,
      });
    } catch (rankError) {
      console.error(
        'mobile dashboard summary: recommendation ranking failed, serving unranked candidates',
        rankError
      );
      recommendedEvents = candidates.events;
    }
  } else {
    recommendedEvents = await EventService.getEvents(
      {
        startDate: new Date(now),
        status: ['confirmed'],
        sortBy: 'date',
        sortDirection: 'asc',
      },
      supabase,
      1,
      DASHBOARD_RECOMMENDATION_POOL
    );
  }

  const upcomingTrackedEvents = trackedEvents
    .filter((record) => record.event && isUpcoming(record.event.startTime, now))
    .sort(
      (left, right) =>
        new Date(left.event?.startTime ?? 0).getTime() -
        new Date(right.event?.startTime ?? 0).getTime()
    );

  const engagementMap = await loadEngagementMap(
    supabase,
    userId,
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

  const recommendedCards = recommendedEvents.map((event) => {
    const score = extractRecommendationScore(event);
    return toMobileEventCard(event, {
      engagement: engagementMap.get(event.id),
      insight: score != null ? `Alignment ${score}` : 'Fresh recommendation',
    });
  });

  const topPickEvents = selectSharedTopPickEvents(recommendedEvents);
  const topPickCards = topPickEvents
    .map((event) => recommendedCards.find((card) => card.id === event.id) ?? null)
    .filter((card): card is NonNullable<typeof card> => Boolean(card));

  const topRecommendation = buildTopRecommendation({
    recommendationCards: topPickCards,
    recommendedEvents: topPickEvents,
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
    recommendationCards: topPickCards,
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
    networkingSummaries,
    now: nowDate,
    toSummary: (event, record) =>
      toMobileEventSummary(event, engagementFromTrackedEvent(record)),
  });

  const networkPulse = buildNetworkPulse({
    contacts: hydratedNetworkingContacts,
  });

  const predictionAccuracy = buildPredictionAccuracy({
    feedbackList,
  });

  const peerComparison = careerProfile
    ? PeerCohortService.calculatePeerComparison(
        careerProfile,
        trackedEvents,
        await CareerProfileService.getPeerProfilesForComparison(
          userId,
          careerProfile,
          readClient
        ).catch((error) => {
          console.warn('[DashboardSummary] Failed to load peer profiles for comparison:', error);
          Sentry.captureException(error, { level: 'warning', extra: { function: 'buildMobileDashboardSummaryForUser', userId, step: 'getPeerProfiles' } });
          return [];
        })
      )
    : null;

  const legacyRecommendedEvents = recommendedEvents.map((event) =>
    toMobileEventSummary(event, engagementMap.get(event.id))
  );

  const summary = buildDashboardSummary({
    hasCompletedOnboarding: Boolean(careerProfile),
    profileHasCompletedOnboarding: Boolean(
      (profile?.preferences as Record<string, unknown> | null | undefined)
        ?.careerOnboardingCompleted
    ),
    trackedCount: trackedEvents.length,
    savedCount: trackedEvents.filter((record) => record.isBookmarked).length,
    attendingCount: trackedEvents.filter((record) => record.status === 'attending')
      .length,
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
    peerComparison,
    predictionAccuracy,
    careerImpact,
    careerOutcomes,
  });

  return {
    summary,
    legacyMobileFields: {
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
  };
}
