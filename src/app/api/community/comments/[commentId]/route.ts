import { NextResponse, type NextRequest } from 'next/server';

import { validateSameOriginRequest } from '@/lib/requestSecurity';
import { isValidUuid } from '@/lib/uuid';
import { CommunityMutationsService } from '@/services/communityMutationsService';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

interface RouteContext {
  params: Promise<{ commentId: string }>;
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

    const { commentId } = await params;
    if (!isValidUuid(commentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid reply id' },
        { status: 400 }
      );
    }

    await CommunityMutationsService.deleteComment(
      authContext.user.id,
      commentId,
      authContext.supabase
    );

    return NextResponse.json({ success: true, data: { id: commentId } });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete reply',
      },
      { status: 400 }
    );
  }
}
