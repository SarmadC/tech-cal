import { NextResponse } from 'next/server';
import { getApiAuthContext } from '@/lib/apiAuth';
import { loadEngagementMap } from '@/app/api/mobile/engagement';
import { buildDashboardHome, toMobileEventCard, trackedRecordToEventCard } from '@/app/api/mobile/serializers';
import { CareerProfileService } from '@/services/careerProfileService';
import { EventService } from '@/services/eventServices';
import { fetchPersonalizedRecommendationCandidates } from '@/services/recommendations/recommendationPipeline';
import { ProfileService } from '@/services/profileService';
import { UserEventService } from '@/services/userEventService';

export async function GET(request: Request) {
  try {
    const { supabase, user } = await getApiAuthContext(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const [trackedEvents, careerProfile, profile] = await Promise.all([
      UserEventService.getTrackedEvents(user.id, supabase),
      CareerProfileService.getCareerProfile(user.id, supabase),
      ProfileService.getProfile(user.id, supabase).catch(() => null),
    ]);

    const recommendationEvents = careerProfile
      ? (
          await fetchPersonalizedRecommendationCandidates({
            supabaseClient: supabase,
            userId: user.id,
            careerProfile,
            limit: 3,
          })
        ).events
      : await EventService.getEvents({ startDate: new Date() }, supabase, 1, 3);

    const engagementMap = await loadEngagementMap(
      supabase,
      user.id,
      recommendationEvents.map((event) => event.id)
    );

    const now = Date.now();
    const upcomingCards = trackedEvents
      .filter((record) => record.event && new Date(record.event.startTime).getTime() >= now)
      .sort(
        (left, right) =>
          new Date(left.event?.startTime ?? 0).getTime() - new Date(right.event?.startTime ?? 0).getTime()
      )
      .map((record) => trackedRecordToEventCard(record))
      .filter((card): card is NonNullable<typeof card> => Boolean(card))
      .slice(0, 3);

    const recommendationCards = recommendationEvents.map((event) =>
      toMobileEventCard(event, {
        engagement: engagementMap.get(event.id),
        insight:
          event.recommendationMetadata?.alignmentScore != null
            ? `Alignment ${Math.round(event.recommendationMetadata.alignmentScore)}`
            : 'Fresh recommendation',
      })
    );

    return NextResponse.json({
      success: true,
      data: buildDashboardHome({
        hasCompletedOnboarding: Boolean(careerProfile),
        profileHasCompletedOnboarding: Boolean(
          (profile?.preferences as Record<string, unknown> | null)?.careerOnboardingCompleted
        ),
        trackedCount: trackedEvents.length,
        savedCount: trackedEvents.filter((record) => record.isBookmarked).length,
        attendingCount: trackedEvents.filter((record) => record.status === 'attending').length,
        recommendationCards,
        upcomingCards,
      }),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load dashboard snapshot',
      },
      { status: 500 }
    );
  }
}
