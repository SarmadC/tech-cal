import type { NextRequest } from 'next/server';
import { unauthorizedJson, errorJson, successJson, catchErrorJson } from '@/lib/api/apiResponse';
import { communityPostDraftSchema } from '@/lib/communitySchemas';
import { validateSameOriginRequest } from '@/lib/requestSecurity';
import { CommunityMutationsService } from '@/services/communityMutationsService';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

export async function POST(request: Request) {
  try {
    const authContext = await getAuthenticatedRequestContext(request as NextRequest);
    if (!authContext) return unauthorizedJson();
    if (authContext.authMethod === 'cookie') {
      const sameOriginError = validateSameOriginRequest(request as NextRequest);
      if (sameOriginError) return errorJson(sameOriginError, 403);
    }

    const parsedPayload = communityPostDraftSchema.safeParse(await request.json());
    if (!parsedPayload.success) {
      return NextResponse.json(
        { success: false, error: 'Post details are invalid.' },
        { status: 400 }
      );
    }
    const post = await CommunityMutationsService.createPost(
      authContext.user.id,
      parsedPayload.data,
      authContext.supabase
    );
    return successJson(post);
  } catch (error) {
    return catchErrorJson(error, 'Failed to create post', 400);
  }
}
