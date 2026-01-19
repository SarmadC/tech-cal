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
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const PADDLE_ENVIRONMENT = (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || 'production') as 'sandbox' | 'production';
const PADDLE_API_KEY = PADDLE_ENVIRONMENT === 'sandbox'
  ? process.env.PADDLE_SANDBOX_API_KEY
  : process.env.PADDLE_API_KEY;

const PADDLE_API_BASE = PADDLE_ENVIRONMENT === 'sandbox'
  ? 'https://sandbox-api.paddle.com'
  : 'https://api.paddle.com';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function createServiceClient() {
  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

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
    const payload: Record<string, string> = {
      type: 'billing_portal',
    };

    // Self-healing: If customer_id is missing, try to fetch it from Paddle using subscription_id
    if (!subscription.paddle_customer_id) {
      if (subscription.paddle_subscription_id) {
        try {
          logger.info('Self-healing: Fetching missing customer_id for subscription', {
            subscriptionId: subscription.paddle_subscription_id
          });

          const subResponse = await fetch(`${PADDLE_API_BASE}/subscriptions/${subscription.paddle_subscription_id}`, {
            headers: {
              Authorization: `Bearer ${PADDLE_API_KEY}`,
            },
          });

          if (subResponse.ok) {
            const subData = await subResponse.json();
            const customerId = subData.data?.customer_id;

            if (customerId) {
              // Update local DB
              const supabase = createServiceClient();
              await supabase
                .from('subscriptions')
                .update({ paddle_customer_id: customerId })
                .eq('id', subscription.id);
              
              subscription.paddle_customer_id = customerId;
              logger.info('Self-healing: Successfully updated customer_id', { customerId });
            }
          }
        } catch (error) {
           logger.error('Self-healing failed:', error);
           // Continue - will fail below with original error if still missing
        }
      }
    }

    if (!subscription.paddle_customer_id) {
      return NextResponse.json(
        { error: 'No Paddle customer linked to this account' },
        { status: 400 }
      );
    }
    
    payload.customer_id = subscription.paddle_customer_id;

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
