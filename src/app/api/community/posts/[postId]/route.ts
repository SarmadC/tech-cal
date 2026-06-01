import { NextResponse, type NextRequest } from 'next/server';

import { validateSameOriginRequest } from '@/lib/requestSecurity';
import { isValidUuid } from '@/lib/uuid';
import { CommunityMutationsService } from '@/services/communityMutationsService';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

interface RouteContext {
  params: Promise<{ postId: string }>;
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const authContext = await getAuthenticatedRequestContext(request as NextRequest);
    if (!authContext) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    if (authContext.authMethod === 'cookie') {
      const sameOriginError = validateSameOriginRequest(request as NextRequest);
      if (sameOriginError) {
        return NextResponse.json({ success: false, error: sameOriginError }, { status: 403 });
      }
    }

    const { postId } = await params;
    if (!isValidUuid(postId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid thread id' },
        { status: 400 }
      );
    }

    await CommunityMutationsService.deletePost(
      authContext.user.id,
      postId,
      authContext.supabase
    );

    return NextResponse.json({ success: true, data: { id: postId } });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete thread',
      },
      { status: 400 }
    );
  }
}
