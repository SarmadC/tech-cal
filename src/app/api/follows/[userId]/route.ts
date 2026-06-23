import { NextRequest } from 'next/server';
import { z } from 'zod';
import { unauthorizedJson, rateLimitedJson, validationErrorJson, successJson, catchErrorJson } from '@/lib/api/apiResponse';
import { FollowService } from '@/services/followService';
import { createRateLimiter, checkRateLimit } from '@/utils/rateLimit';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

const ParamsSchema = z.object({
  userId: z.string().uuid(),
});

const unfollowActionRateLimiter = createRateLimiter('social-unfollow-actions', 'FOLLOW_ACTIONS_DAILY');

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const authContext = await getAuthenticatedRequestContext(request as NextRequest);
    if (!authContext) return unauthorizedJson();

    const rateLimitResult = await checkRateLimit(unfollowActionRateLimiter, authContext.user.id);
    if (!rateLimitResult.success) return rateLimitedJson();

    const parsedParams = ParamsSchema.safeParse(await params);
    if (!parsedParams.success) return validationErrorJson('Invalid user ID');

    await FollowService.unfollowUser(
      authContext.user.id,
      parsedParams.data.userId,
      authContext.supabase
    );

    return successJson({ message: 'User unfollowed successfully.' });
  } catch (error) {
    console.error('Unfollow user API error:', error);
    return catchErrorJson(error, 'Failed to unfollow user');
  }
}
