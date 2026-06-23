import { NextRequest } from 'next/server';
import { z } from 'zod';
import { unauthorizedJson, validationErrorJson, successJson, catchErrorJson } from '@/lib/api/apiResponse';
import { FollowService } from '@/services/followService';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

const ParamsSchema = z.object({
  userId: z.string().uuid(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const authContext = await getAuthenticatedRequestContext(request as NextRequest);
    if (!authContext) return unauthorizedJson();

    const parsedParams = ParamsSchema.safeParse(await params);
    if (!parsedParams.success) return validationErrorJson('Invalid user ID');

    const status = await FollowService.getFollowStatus(
      authContext.user.id,
      parsedParams.data.userId,
      authContext.supabase
    );

    return successJson(status);
  } catch (error) {
    console.error('Follow status API error:', error);
    return catchErrorJson(error, 'Failed to fetch follow status');
  }
}
