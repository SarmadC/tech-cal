import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { BlockService } from '@/services/blockService';
import { TrustLevelService } from '@/services/trustLevelService';
import { createRateLimiter, checkRateLimit } from '@/utils/rateLimit';

const ParamsSchema = z.object({
  userId: z.string().uuid(),
});

const unblockActionRateLimiter = createRateLimiter('social-unblock-actions', 'LOW_FREQUENCY');

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

    const rateLimitResult = await checkRateLimit(unblockActionRateLimiter, user.id);
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

    await BlockService.unblockUser(user.id, parsedParams.data.userId, supabase);
    await TrustLevelService.evaluateAndPersistTrustLevel(user.id, supabase);

    return NextResponse.json({
      success: true,
      message: 'User unblocked successfully.',
    });
  } catch (error) {
    console.error('Unblock user API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to unblock user' },
      { status: 500 }
    );
  }
}
