import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { FollowService } from '@/services/followService';
import { createRateLimiter, checkRateLimit } from '@/utils/rateLimit';

const ParamsSchema = z.object({
  userId: z.string().uuid(),
});

const unfollowActionRateLimiter = createRateLimiter('social-unfollow-actions', 'FOLLOW_ACTIONS_DAILY');

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const rateLimitResult = await checkRateLimit(unfollowActionRateLimiter, user.id);
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

    await FollowService.unfollowUser(user.id, parsedParams.data.userId, supabase);

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
