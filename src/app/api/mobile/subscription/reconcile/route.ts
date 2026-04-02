import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

import {
  reconcileRevenueCatSubscription,
  revenueCatReconcileSchema,
} from '@/lib/mobileSubscriptions';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthenticatedRequestContext(request);
    if (!authContext) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = revenueCatReconcileSchema.parse(await request.json());
    const subscription = await reconcileRevenueCatSubscription(authContext.user.id, payload);

    return NextResponse.json({
      success: true,
      data: subscription,
      message: 'Subscription reconciled successfully.',
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid subscription payload',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to reconcile subscription',
      },
      { status: 500 }
    );
  }
}
