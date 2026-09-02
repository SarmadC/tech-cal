import type { NextRequest } from 'next/server';

import { unauthorizedJson, errorJson, validationErrorJson, successJson, catchErrorJson } from '@/lib/api/apiResponse';
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
    if (!authContext) return unauthorizedJson();
    if (authContext.authMethod === 'cookie') {
      const sameOriginError = validateSameOriginRequest(request as NextRequest);
      if (sameOriginError) return errorJson(sameOriginError, 403);
    }

    const { commentId } = await params;
    if (!isValidUuid(commentId)) return validationErrorJson('Invalid reply id');

    await CommunityMutationsService.deleteComment(
      authContext.user.id,
      commentId,
      authContext.supabase
    );

    return successJson({ id: commentId });
  } catch (error) {
    return catchErrorJson(error, 'Failed to delete reply', 400);
  }
}
