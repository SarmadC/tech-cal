import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { FollowService } from '@/services/followService';
import { TrustLevelService } from '@/services/trustLevelService';
import { createRateLimiter, checkRateLimit } from '@/utils/rateLimit';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

const FollowRequestSchema = z.object({
  userId: z.string().uuid(),
});

const followActionRateLimiter = createRateLimiter('social-follow-actions', 'FOLLOW_ACTIONS_DAILY');

const getStatusForError = (error: unknown): number => {
  if (!(error instanceof Error)) {
    return 500;
  }

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
    if (!authContext) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const rateLimitResult = await checkRateLimit(
      followActionRateLimiter,
      authContext.user.id
    );
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const validation = FollowRequestSchema.safeParse(await request.json());
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const trust = await TrustLevelService.evaluateAndPersistTrustLevel(
      authContext.user.id,
      authContext.supabase
    );
    if (trust.level < 1) {
      return NextResponse.json(
        {
          success: false,
          error: 'Following is available after 7 days and onboarding completion.',
        },
        { status: 403 }
      );
    }

    await FollowService.followUser(
      authContext.user.id,
      validation.data.userId,
      authContext.supabase
    );

    return NextResponse.json({
      success: true,
      message: 'User followed successfully.',
    });
  } catch (error) {
    console.error('Follow user API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to follow user' },
      { status: getStatusForError(error) }
    );
  }
}
