import { NextResponse } from 'next/server';
import { getApiAuthContext } from '@/lib/apiAuth';
import { toMobileCommunityCirclePage } from '@/app/api/mobile/communitySerializers';
import { CircleDiscussionService } from '@/services/circleDiscussionService';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { supabase, user } = await getApiAuthContext(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { slug } = await params;
    const data = await CircleDiscussionService.getCirclePageData({
      slug,
      viewerId: user.id,
      readClient: supabase,
    });

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Circle not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: toMobileCommunityCirclePage(data),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load circle',
      },
      { status: 500 }
    );
  }
}
