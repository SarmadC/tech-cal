/**
 * POST /api/paddle/customer-portal
 *
 * Creates a Paddle billing portal session for the authenticated user.
 * Returns the hosted portal URL where customers can manage payment methods,
 * download invoices, or cancel their plan.
 *
 * @server-only
 */

import { NextResponse } from 'next/server';
import { withSubscription } from '@/lib/subscription';
import { logger } from '@/utils/logger';

const PADDLE_ENVIRONMENT = (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || 'production') as 'sandbox' | 'production';
const PADDLE_API_KEY = PADDLE_ENVIRONMENT === 'sandbox'
  ? process.env.PADDLE_SANDBOX_API_KEY
  : process.env.PADDLE_API_KEY;

const PADDLE_API_BASE = PADDLE_ENVIRONMENT === 'sandbox'
  ? 'https://sandbox-api.paddle.com'
  : 'https://api.paddle.com';

interface PaddleSessionResponse {
  data?: {
    id: string;
    url: string;
    status?: string;
  };
  error?: {
    message: string;
    type?: string;
  };
}

export const POST = withSubscription(
  async (_request, subscription) => {
    if (!subscription.paddle_customer_id) {
      return NextResponse.json(
        { error: 'No Paddle customer linked to this account' },
        { status: 400 }
      );
    }

    if (!PADDLE_API_KEY) {
      logger.error('Paddle API key not configured');
      return NextResponse.json(
        { error: 'Billing portal unavailable. Please contact support.' },
        { status: 500 }
      );
    }

    const payload: Record<string, string> = {
      customer_id: subscription.paddle_customer_id,
      type: 'billing_portal',
    };

    const returnUrl = process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/settings?tab=billing`
      : undefined;

    if (returnUrl) {
      payload.return_url = returnUrl;
    }

    try {
      const response = await fetch(`${PADDLE_API_BASE}/billing/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${PADDLE_API_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      const data: PaddleSessionResponse = await response.json();

      if (!response.ok) {
        logger.error('Failed to create Paddle billing portal session', {
          status: response.status,
          body: data,
        });
        return NextResponse.json(
          { error: data.error?.message || 'Unable to open billing portal' },
          { status: response.status }
        );
      }

      const portalUrl = data.data?.url;
      if (!portalUrl) {
        logger.error('Paddle response missing billing portal URL', data);
        return NextResponse.json(
          { error: 'Billing portal unavailable. Please contact support.' },
          { status: 502 }
        );
      }

      return NextResponse.json({ url: portalUrl });
    } catch (error) {
      logger.error('Error creating Paddle billing portal session', error);
      return NextResponse.json(
        { error: 'Unable to reach Paddle. Please try again.' },
        { status: 502 }
      );
    }
  },
  { requirePro: true }
);
