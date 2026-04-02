import { NextRequest, NextResponse } from 'next/server';

import { getMobileSubscriptionOfferings } from '@/lib/mobileSubscriptions';
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

    return NextResponse.json({
      success: true,
      data: getMobileSubscriptionOfferings(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load offerings',
      },
      { status: 500 }
    );
  }
}
