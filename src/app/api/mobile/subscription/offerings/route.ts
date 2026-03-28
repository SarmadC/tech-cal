import { NextResponse } from 'next/server';
import { getApiAuthContext } from '@/lib/apiAuth';
import { getMobileSubscriptionOfferings } from '@/lib/mobileSubscriptions';

export async function GET(request: Request) {
  try {
    const { user } = await getApiAuthContext(request);
    if (!user) {
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
