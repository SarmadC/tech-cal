import { NextResponse } from 'next/server';
import { revenueCatReconcileSchema } from '@kurecal/domain';
import { getApiAuthContext } from '@/lib/apiAuth';
import { reconcileRevenueCatSubscription } from '@/lib/mobileSubscriptions';

export async function POST(request: Request) {
  try {
    const { user } = await getApiAuthContext(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = revenueCatReconcileSchema.parse(await request.json());
    const subscription = await reconcileRevenueCatSubscription(user.id, payload);

    return NextResponse.json({
      success: true,
      data: subscription,
      message: 'Subscription reconciled successfully.',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reconcile subscription',
      },
      { status: 400 }
    );
  }
}
