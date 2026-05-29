import { NextResponse, type NextRequest } from 'next/server';
import { communityCommentDraftSchema } from '@/lib/communitySchemas';
import { validateSameOriginRequest } from '@/lib/requestSecurity';
import { CommunityMutationsService } from '@/services/communityMutationsService';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

export async function POST(request: Request) {
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

    const payload = communityCommentDraftSchema.parse(await request.json());
    const comment = await CommunityMutationsService.createComment(
      authContext.user.id,
      payload,
      authContext.supabase
    );

    return NextResponse.json({ success: true, data: comment });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create comment',
      },
      { status: 400 }
    );
  }
}
