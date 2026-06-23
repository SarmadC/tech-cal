import type { NextRequest } from 'next/server';
import { unauthorizedJson, errorJson, successJson, catchErrorJson } from '@/lib/api/apiResponse';
import { communityCommentDraftSchema } from '@/lib/communitySchemas';
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

    const payload = communityCommentDraftSchema.parse(await request.json());
    const comment = await CommunityMutationsService.createComment(
      authContext.user.id,
      payload,
      authContext.supabase
    );

    return successJson(comment);
  } catch (error) {
    return catchErrorJson(error, 'Failed to create comment', 400);
  }
}
