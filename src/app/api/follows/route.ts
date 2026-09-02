import { NextRequest } from 'next/server';
import { z } from 'zod';
import { unauthorizedJson, rateLimitedJson, validationErrorJson, successJson, errorJson, catchErrorJson } from '@/lib/api/apiResponse';
import { FollowService } from '@/services/followService';
import { TrustLevelService } from '@/services/trustLevelService';
import { createRateLimiter, checkRateLimit } from '@/utils/rateLimit';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

const FollowRequestSchema = z.object({
  userId: z.string().uuid(),
});

const followActionRateLimiter = createRateLimiter('social-follow-actions', 'FOLLOW_ACTIONS_DAILY');

const getStatusForError = (error: unknown): number => {
  if (!(error instanceof Error)) return 500;
  if (
    error.message.includes('cannot follow yourself') ||
    error.message.includes('Unblock this user') ||
    error.message.includes('blocked you')
  ) {
    return 400;
  }
  return 500;
};

export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthenticatedRequestContext(request);
    if (!authContext) return unauthorizedJson();

    const rateLimitResult = await checkRateLimit(followActionRateLimiter, authContext.user.id);
    if (!rateLimitResult.success) return rateLimitedJson();

    const validation = FollowRequestSchema.safeParse(await request.json());
    if (!validation.success) {
      return validationErrorJson('Invalid input', validation.error.issues);
    }

    const trust = await TrustLevelService.evaluateAndPersistTrustLevel(
      authContext.user.id,
      authContext.supabase
    );
    if (trust.level < 1) {
      return errorJson('Following is available after 7 days and onboarding completion.', 403);
    }

    await FollowService.followUser(
      authContext.user.id,
      validation.data.userId,
      authContext.supabase
    );

    return successJson({ message: 'User followed successfully.' });
  } catch (error) {
    console.error('Follow user API error:', error);
    return catchErrorJson(error, 'Failed to follow user', getStatusForError(error));
  }
}
