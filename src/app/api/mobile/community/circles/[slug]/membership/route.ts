import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { CommunityMutationsService } from '@/services/communityMutationsService';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

const bodySchema = z.object({
  state: z.enum(['none', 'following', 'joined']),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const authContext = await getAuthenticatedRequestContext(
      request as NextRequest
    );
    if (!authContext) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid membership state' },
        { status: 400 }
      );
    }

    const circleResult = await authContext.supabase
      .from('circles')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (!circleResult.data) {
      return NextResponse.json(
        { success: false, error: 'Circle not found' },
        { status: 404 }
      );
    }

    await CommunityMutationsService.setMembershipState(
      authContext.user.id,
      circleResult.data.id,
      parsed.data.state,
      authContext.supabase
    );

    return NextResponse.json({ success: true, data: { state: parsed.data.state } });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update membership',
      },
      { status: 500 }
    );
  }
}
