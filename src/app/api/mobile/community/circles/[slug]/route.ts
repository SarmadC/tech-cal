import { NextResponse, type NextRequest } from 'next/server';

import { buildMobileCommunityCirclePage } from '@/app/api/mobile/communitySerializers';
import { CircleDiscussionService } from '@/services/circleDiscussionService';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const authContext = await getAuthenticatedRequestContext(request as NextRequest);
    if (!authContext) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { slug } = await params;
    const data = await CircleDiscussionService.getCirclePageData({
      slug,
      viewerId: authContext.user.id,
      readClient: authContext.supabase,
    });

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Circle not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: buildMobileCommunityCirclePage(data),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load community circle',
      },
      { status: 500 }
    );
  }
}
