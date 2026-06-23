import { timingSafeEqual } from 'crypto';

import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

import {
  processRevenueCatWebhookEvent,
  revenueCatWebhookEnvelopeSchema,
} from '@/lib/mobileSubscriptions';

function getConfiguredAuthorizationHeader(): string | null {
  const value =
    process.env.REVENUECAT_WEBHOOK_SECRET ??
    process.env.REVENUECAT_WEBHOOK_AUTHORIZATION;
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function constantTimeEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function isAuthorized(request: NextRequest): boolean {
  const expected = getConfiguredAuthorizationHeader();
  if (!expected) {
    return false;
  }

  const actual = request.headers.get('authorization')?.trim();
  return Boolean(actual && constantTimeEquals(actual, expected));
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: 'Invalid RevenueCat webhook authorization' },
      { status: 401 }
    );
  }

  try {
    const envelope = revenueCatWebhookEnvelopeSchema.parse(await request.json());
    const subscription = await processRevenueCatWebhookEvent(envelope);

    return NextResponse.json({
      success: true,
      data: subscription,
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
          error: 'Invalid RevenueCat webhook payload',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process RevenueCat webhook',
      },
      { status: 500 }
    );
  }
}
