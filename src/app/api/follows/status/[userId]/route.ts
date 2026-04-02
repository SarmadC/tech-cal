import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getApiAuthContext } from '@/lib/apiAuth';
import { FollowService } from '@/services/followService';

const ParamsSchema = z.object({
  userId: z.string().uuid(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { supabase, user } = await getApiAuthContext(_request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const parsedParams = ParamsSchema.safeParse(await params);
    if (!parsedParams.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    const status = await FollowService.getFollowStatus(user.id, parsedParams.data.userId, supabase);

    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('Follow status API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch follow status' },
      { status: 500 }
    );
  }
}
