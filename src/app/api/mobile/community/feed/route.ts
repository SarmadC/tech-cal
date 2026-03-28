import { NextResponse } from 'next/server';
import { getApiAuthContext } from '@/lib/apiAuth';
import { CommunityHubService } from '@/services/communityHubService';

export async function GET(request: Request) {
  try {
    const { supabase, user } = await getApiAuthContext(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const data = await CommunityHubService.getFeedPageData({
      viewerId: user.id,
      readClient: supabase,
    });

    return NextResponse.json({
      success: true,
      data: {
        feed: data.feed,
        joinedCircleCount: data.circles.filter((circle) => circle.isJoined).length,
        upcomingCount: data.upcomingEvents.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load community feed',
      },
      { status: 500 }
    );
  }
}
