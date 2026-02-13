import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { requireOnboardedApi } from '@/utils/onboarding';
import { CareerProfileService } from '@/services/careerProfileService';
import { PeerCohortService, type PeerComparisonSnapshot } from '@/services/peerCohortService';
import { UserEventService } from '@/services/userEventService';

const EMPTY_PEER_COMPARISON: PeerComparisonSnapshot = {
  percentile: 50,
  comparison: 'average',
  sampleSize: 0,
  confidence: 'low',
  recommendation: 'Complete your career profile to enable peer comparison'
};

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const onboardingGuard = await requireOnboardedApi(supabase, user.id);
    if (onboardingGuard) return onboardingGuard;

    const appProfile = await CareerProfileService.getUserProfile(user.id, supabase).catch(() => null);
    const storedCareerProfile = await CareerProfileService.getCareerProfile(user.id, supabase);
    const careerProfile =
      storedCareerProfile ?? CareerProfileService.getCareerProfileFromPreferences(appProfile);

    if (!careerProfile) {
      return NextResponse.json({
        success: true,
        data: { peerComparison: EMPTY_PEER_COMPARISON }
      });
    }

    const [trackedEvents, peerProfiles] = await Promise.all([
      UserEventService.getLightweightTrackedEvents(user.id, supabase).catch(() => []),
      CareerProfileService.getPeerProfilesForComparison(user.id, careerProfile, supabase).catch(() => [])
    ]);

    const peerComparison = PeerCohortService.calculatePeerComparison(
      careerProfile,
      trackedEvents,
      peerProfiles
    );

    const response = NextResponse.json({
      success: true,
      data: { peerComparison }
    });

    response.headers.set('Cache-Control', 'private, max-age=120, stale-while-revalidate=300');
    return response;
  } catch (error) {
    console.error('Peer comparison API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
