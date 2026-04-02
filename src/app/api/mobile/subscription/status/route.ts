import { NextRequest, NextResponse } from 'next/server';

import { getNormalizedSubscriptionForUser } from '@/lib/mobileSubscriptions';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthenticatedRequestContext(request);
    if (!authContext) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const subscription = await getNormalizedSubscriptionForUser(authContext.user.id);
    return NextResponse.json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load subscription status',
      },
      { status: 500 }
    );
  }
}
