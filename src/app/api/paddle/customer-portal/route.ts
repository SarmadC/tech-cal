/**
 * POST /api/paddle/customer-portal
 *
 * Creates a Paddle Customer Portal Session for the authenticated user.
 * Uses the new Customer Portal Sessions API which provides:
 * - Authenticated deep links (auto-sign-in, no magic link needed)
 * - Direct links to specific actions (cancel, update payment method)
 * - Better UX for in-app billing management
 *
 * @see https://developer.paddle.com/build/customers/integrate-customer-portal
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

// Customer Portal Sessions API response types
interface PortalSubscriptionUrls {
  id: string;
  cancel_subscription: string;
  update_subscription_payment_method: string;
}

interface CustomerPortalSessionResponse {
  data?: {
    id: string;
    customer_id: string;
    urls: {
      general: {
        overview: string;
      };
      subscriptions: PortalSubscriptionUrls[];
    };
    created_at: string;
  };
  error?: {
    type: string;
    code: string;
    detail: string;
    documentation_url?: string;
  };
}

// Response type for the frontend
export interface CustomerPortalLinks {
  overview: string;
  subscriptions?: Array<{
    id: string;
    cancel: string;
    updatePayment: string;
  }>;
}

export const POST = withSubscription(
  async (_request, subscription) => {
    // Validate API key is configured
    if (!PADDLE_API_KEY) {
      const envVar = PADDLE_ENVIRONMENT === 'sandbox' ? 'PADDLE_SANDBOX_API_KEY' : 'PADDLE_API_KEY';
      logger.error(`Missing Paddle API key: ${envVar} is not set`);
      return NextResponse.json(
        { error: `Billing portal unavailable. Server configuration error: missing ${envVar}` },
        { status: 500 }
      );
    }

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

    // Build request payload for Customer Portal Sessions API
    // Include subscription_ids to get deep links for subscription management
    const payload: { subscription_ids?: string[] } = {};
    
    if (subscription.paddle_subscription_id) {
      payload.subscription_ids = [subscription.paddle_subscription_id];
    }

    try {
      // Use Customer Portal Sessions API endpoint
      const response = await fetch(
        `${PADDLE_API_BASE}/customers/${subscription.paddle_customer_id}/portal-sessions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${PADDLE_API_KEY}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data: CustomerPortalSessionResponse = await response.json();

      if (!response.ok) {
        logger.error('Failed to create Customer Portal Session', {
          status: response.status,
          error: data.error,
          customerId: subscription.paddle_customer_id,
        });
        return NextResponse.json(
          { error: data.error?.detail || 'Unable to open billing portal' },
          { status: response.status }
        );
      }

      if (!data.data?.urls?.general?.overview) {
        logger.error('Customer Portal Session response missing URLs', data);
        return NextResponse.json(
          { error: 'Billing portal unavailable. Please contact support.' },
          { status: 502 }
        );
      }

      // Build response with all available portal links
      const portalLinks: CustomerPortalLinks = {
        overview: data.data.urls.general.overview,
      };

      // Add subscription-specific deep links if available
      if (data.data.urls.subscriptions && data.data.urls.subscriptions.length > 0) {
        portalLinks.subscriptions = data.data.urls.subscriptions.map((sub) => ({
          id: sub.id,
          cancel: sub.cancel_subscription,
          updatePayment: sub.update_subscription_payment_method,
        }));
      }

      logger.info('Customer Portal Session created', {
        sessionId: data.data.id,
        customerId: subscription.paddle_customer_id,
        hasSubscriptionLinks: !!portalLinks.subscriptions?.length,
      });

      // Return both the overview URL (for backward compatibility) and all links
      return NextResponse.json({
        url: portalLinks.overview,
        links: portalLinks,
      });
    } catch (error) {
      logger.error('Error creating Customer Portal Session', error);
      return NextResponse.json(
        { error: 'Unable to reach Paddle. Please try again.' },
        { status: 502 }
      );
    }
  },
  { requirePro: true }
);
