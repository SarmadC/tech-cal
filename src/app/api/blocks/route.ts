import { NextRequest } from 'next/server';
import { z } from 'zod';
import { unauthorizedJson, rateLimitedJson, validationErrorJson, successJson, errorJson, catchErrorJson } from '@/lib/api/apiResponse';
import { getServiceSupabaseClient } from '@/lib/api/serviceClient';
import { BlockService } from '@/services/blockService';
import { TrustLevelService } from '@/services/trustLevelService';
import { createRateLimiter, checkRateLimit } from '@/utils/rateLimit';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

const BlockRequestSchema = z.object({
  blockedUserId: z.string().uuid(),
});

const blockActionRateLimiter = createRateLimiter('social-block-actions', 'LOW_FREQUENCY');

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthenticatedRequestContext(request);
    if (!authContext) return unauthorizedJson();

    const readSupabase = getServiceSupabaseClient();
    if (!readSupabase) return errorJson('Blocks service is not configured.', 500);

    const blockedUsers = await BlockService.getBlockedUsersForUser(
      authContext.user.id,
      readSupabase
    );

    return successJson(blockedUsers);
  } catch (error) {
    console.error('Get blocked users API error:', error);
    return catchErrorJson(error, 'Failed to fetch blocked users');
  }
}

export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthenticatedRequestContext(request);
    if (!authContext) return unauthorizedJson();

    const rateLimitResult = await checkRateLimit(blockActionRateLimiter, authContext.user.id);
    if (!rateLimitResult.success) return rateLimitedJson();

    const body = await request.json();
    const validation = BlockRequestSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorJson('Invalid input', validation.error.issues);
    }

    await BlockService.blockUser(
      authContext.user.id,
      validation.data.blockedUserId,
      authContext.supabase
    );
    await TrustLevelService.evaluateAndPersistTrustLevel(
      authContext.user.id,
      authContext.supabase
    );

    return successJson({ message: 'User blocked successfully.' });
  } catch (error) {
    console.error('Block user API error:', error);
    return catchErrorJson(error, 'Failed to block user');
  }
}
