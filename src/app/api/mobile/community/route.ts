import { NextResponse, type NextRequest } from 'next/server';

import { buildMobileCommunityHome } from '@/app/api/mobile/communitySerializers';
import { CommunityHubService } from '@/services/communityHubService';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

export async function GET(request: Request) {
  try {
    const authContext = await getAuthenticatedRequestContext(request as NextRequest);
    if (!authContext) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const data = await CommunityHubService.getFeedPageData({
      viewerId: authContext.user.id,
      readClient: authContext.supabase,
    });

    return NextResponse.json({
      success: true,
      data: buildMobileCommunityHome(data),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load community home',
      },
      { status: 500 }
    );
  }
}
