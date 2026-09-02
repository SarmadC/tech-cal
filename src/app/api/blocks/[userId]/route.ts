import { z } from 'zod';
import { unauthorizedJson, rateLimitedJson, validationErrorJson, successJson, catchErrorJson } from '@/lib/api/apiResponse';
import { BlockService } from '@/services/blockService';
import { TrustLevelService } from '@/services/trustLevelService';
import { createRateLimiter, checkRateLimit } from '@/utils/rateLimit';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

const ParamsSchema = z.object({
  userId: z.string().uuid(),
});

const unblockActionRateLimiter = createRateLimiter('social-unblock-actions', 'LOW_FREQUENCY');

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const authContext = await getAuthenticatedRequestContext(request as never);
    if (!authContext) return unauthorizedJson();

    const rateLimitResult = await checkRateLimit(unblockActionRateLimiter, authContext.user.id);
    if (!rateLimitResult.success) return rateLimitedJson();

    const parsedParams = ParamsSchema.safeParse(await params);
    if (!parsedParams.success) return validationErrorJson('Invalid user ID');

    await BlockService.unblockUser(
      authContext.user.id,
      parsedParams.data.userId,
      authContext.supabase
    );
    await TrustLevelService.evaluateAndPersistTrustLevel(
      authContext.user.id,
      authContext.supabase
    );

    return successJson({ message: 'User unblocked successfully.' });
  } catch (error) {
    console.error('Unblock user API error:', error);
    return catchErrorJson(error, 'Failed to unblock user');
  }
}
