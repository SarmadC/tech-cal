import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/utils/supabase/service';
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
    if (!authContext) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: 'Blocks service is not configured.' },
        { status: 500 }
      );
    }

    const readSupabase = createServiceClient(supabaseUrl, serviceRoleKey);
    const blockedUsers = await BlockService.getBlockedUsersForUser(
      authContext.user.id,
      readSupabase
    );

    return NextResponse.json({
      success: true,
      data: blockedUsers,
    });
  } catch (error) {
    console.error('Get blocked users API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch blocked users' },
      { status: 500 }
    );
  }
}

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
      blockActionRateLimiter,
      authContext.user.id
    );
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validation = BlockRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
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

    return NextResponse.json({
      success: true,
      message: 'User blocked successfully.',
    });
  } catch (error) {
    console.error('Block user API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to block user' },
      { status: 500 }
    );
  }
}
