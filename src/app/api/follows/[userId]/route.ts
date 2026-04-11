import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
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
    if (!authContext) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const rateLimitResult = await checkRateLimit(
      unfollowActionRateLimiter,
      authContext.user.id
    );
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const parsedParams = ParamsSchema.safeParse(await params);
    if (!parsedParams.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    await FollowService.unfollowUser(
      authContext.user.id,
      parsedParams.data.userId,
      authContext.supabase
    );

    return NextResponse.json({
      success: true,
      message: 'User unfollowed successfully.',
    });
  } catch (error) {
    console.error('Unfollow user API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to unfollow user' },
      { status: 500 }
    );
  }
}
