import { NextResponse } from 'next/server';
import { getApiAuthContext } from '@/lib/apiAuth';
import { toMobileCommunityPostPage } from '@/app/api/mobile/communitySerializers';
import { CircleDiscussionService } from '@/services/circleDiscussionService';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { supabase, user } = await getApiAuthContext(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { postId } = await params;
    const data = await CircleDiscussionService.getCirclePostPageData({
      postId,
      viewerId: user.id,
      readClient: supabase,
    });

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: toMobileCommunityPostPage(data),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load post',
      },
      { status: 500 }
    );
  }
}
