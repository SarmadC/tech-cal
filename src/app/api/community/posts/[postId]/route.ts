import type { NextRequest } from 'next/server';

import { unauthorizedJson, errorJson, validationErrorJson, successJson, catchErrorJson } from '@/lib/api/apiResponse';
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
    if (!authContext) return unauthorizedJson();
    if (authContext.authMethod === 'cookie') {
      const sameOriginError = validateSameOriginRequest(request as NextRequest);
      if (sameOriginError) return errorJson(sameOriginError, 403);
    }

    const { postId } = await params;
    if (!isValidUuid(postId)) return validationErrorJson('Invalid thread id');

    await CommunityMutationsService.deletePost(
      authContext.user.id,
      postId,
      authContext.supabase
    );

    return successJson({ id: postId });
  } catch (error) {
    return catchErrorJson(error, 'Failed to delete thread', 400);
  }
}
