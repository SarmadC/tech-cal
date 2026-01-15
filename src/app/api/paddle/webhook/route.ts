/**
 * POST /api/paddle/webhook
 *
 * Paddle webhook handler for subscription lifecycle events.
 * This is the source of truth for subscription entitlements.
 *
 * Security:
 * - Verifies Paddle webhook signatures
 * - Uses idempotency keys to prevent duplicate processing
 * - Fails open to avoid blocking legitimate requests
 *
 * @server-only
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as Sentry from '@sentry/nextjs';
import { logger } from '@/utils/logger';
import {
  DEFAULT_ENTITLEMENTS,
  PADDLE_STATUS_MAP,
  type SubscriptionStatus,
  type SubscriptionTier,
  type SubscriptionEntitlements,
} from '@/types/subscription';
import type { Database, Json } from '@/types/supabase';
import crypto from 'crypto';

// Environment variables
const PADDLE_ENVIRONMENT = (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || 'production') as 'sandbox' | 'production';
const PADDLE_WEBHOOK_SECRET = PADDLE_ENVIRONMENT === 'sandbox'
  ? process.env.PADDLE_SANDBOX_WEBHOOK_SECRET
  : process.env.PADDLE_WEBHOOK_SECRET;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

// Create Supabase client with service role for webhook operations
function getServiceClient() {
  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

// Paddle webhook event types
type PaddleEventType =
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.canceled'
  | 'subscription.past_due'
  | 'subscription.activated'
  | 'subscription.paused'
  | 'subscription.resumed';

interface PaddleWebhookEvent {
  event_id: string;
  event_type: PaddleEventType;
  occurred_at: string;
  data: {
    id: string; // Paddle subscription ID
    status: string;
    customer_id: string;
    address_id?: string;
    business_id?: string;
    currency_code: string;
    created_at: string;
    updated_at: string;
    started_at?: string;
    first_billed_at?: string;
    next_billed_at?: string;
    paused_at?: string;
    canceled_at?: string;
    discount?: unknown;
    collection_mode: string;
    billing_details?: unknown;
    current_billing_period?: {
      starts_at: string;
      ends_at: string;
    };
    billing_cycle?: {
      interval: string;
      frequency: number;
    };
    scheduled_change?: unknown;
    items?: Array<{
      price: {
        id: string;
        product_id: string;
      };
      quantity: number;
    }>;
    custom_data?: {
      user_id?: string;
    };
    management_urls?: {
      update_payment_method: string;
      cancel: string;
    };
  };
}

// Maximum age for webhook signatures (5 minutes in milliseconds)
const WEBHOOK_SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000;

/**
 * Verify Paddle webhook signature and timestamp
 * Protects against replay attacks by rejecting stale signatures
 */
function verifySignature(
  payload: string,
  signature: string | null
): boolean {
  if (!PADDLE_WEBHOOK_SECRET || !signature) {
    logger.warn('Missing webhook secret or signature');
    return false;
  }

  try {
    // Paddle sends signature as "ts=TIMESTAMP;h1=SIGNATURE"
    const signatureParts = signature.split(';');

    // Extract and validate timestamp to prevent replay attacks
    const tsPart = signatureParts.find((p) => p.startsWith('ts='));
    const timestamp = tsPart?.split('=')[1];

    if (!timestamp) {
      logger.warn('Could not extract timestamp from signature header');
      return false;
    }

    // Check if signature is too old (replay attack protection)
    const signatureAge = Date.now() - parseInt(timestamp, 10) * 1000;
    if (signatureAge > WEBHOOK_SIGNATURE_MAX_AGE_MS) {
      logger.warn('Webhook signature is too old', {
        signatureAge: signatureAge / 1000 + 's',
        maxAge: WEBHOOK_SIGNATURE_MAX_AGE_MS / 1000 + 's'
      });
      return false;
    }

    // Also reject timestamps from the future (clock skew tolerance: 1 minute)
    if (signatureAge < -60000) {
      logger.warn('Webhook signature timestamp is in the future');
      return false;
    }

    // Extract the actual signature hash
    const h1Part = signatureParts.find((p) => p.startsWith('h1='));
    const actualSignature = h1Part?.split('=')[1];

    if (!actualSignature) {
      logger.warn('Could not extract signature from header');
      return false;
    }

    // Paddle uses HMAC-SHA256 for webhook signatures
    const expectedSignature = crypto
      .createHmac('sha256', PADDLE_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(actualSignature)
    );
  } catch (error) {
    logger.error('Error verifying webhook signature:', error);
    return false;
  }
}

/**
 * Send alert to Slack for webhook failures
 */
async function sendSlackAlert(message: string, details: unknown): Promise<void> {
  if (!SLACK_WEBHOOK_URL) return;

  try {
    await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `:warning: Paddle Webhook Alert`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${message}*\n\`\`\`${JSON.stringify(details, null, 2)}\`\`\``,
            },
          },
        ],
      }),
    });
  } catch (error) {
    logger.error('Failed to send Slack alert:', error);
  }
}

/**
 * Check if event was already processed (idempotency)
 */
async function isEventProcessed(
  supabase: ReturnType<typeof getServiceClient>,
  eventId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('subscription_events')
    .select('id')
    .eq('paddle_event_id', eventId)
    .single();

  return !!data;
}

/**
 * Record processed event for idempotency
 */
async function recordEvent(
  supabase: ReturnType<typeof getServiceClient>,
  event: PaddleWebhookEvent,
  subscriptionId: string | null
): Promise<void> {
  await supabase.from('subscription_events').insert({
    paddle_event_id: event.event_id,
    event_type: event.event_type,
    payload: event as unknown as Json,
    subscription_id: subscriptionId,
  });
}

/**
 * Record failed event to DLQ
 */
async function recordFailedEvent(
  supabase: ReturnType<typeof getServiceClient>,
  event: PaddleWebhookEvent,
  errorMessage: string,
  errorDetails: unknown
): Promise<void> {
  await supabase.from('subscription_events_dlq').insert({
    paddle_event_id: event.event_id,
    event_type: event.event_type,
    payload: event as unknown as Json,
    error_message: errorMessage,
    error_details: errorDetails as Json,
  });
}

/**
 * Map Paddle status to our subscription status
 */
function mapPaddleStatus(paddleStatus: string): SubscriptionStatus {
  return PADDLE_STATUS_MAP[paddleStatus] || 'active';
}

/**
 * Determine tier based on price ID and status
 * Trialing users always get pro tier regardless of price ID
 */
function determineTier(priceId: string | undefined, status?: string): SubscriptionTier {
  // Trialing users always get pro tier (trials may not have priceId yet)
  if (status === 'trialing') {
    return 'pro';
  }
  // For now, any paid subscription is 'pro'
  // Team tier will be added later with different price IDs
  if (priceId) {
    return 'pro';
  }
  return 'free';
}

/**
 * Get entitlements as Json type for database storage
 */
function getEntitlementsJson(tier: SubscriptionTier): Json {
  return DEFAULT_ENTITLEMENTS[tier] as unknown as Json;
}

/**
 * Handle subscription.created event
 */
async function handleSubscriptionCreated(
  supabase: ReturnType<typeof getServiceClient>,
  event: PaddleWebhookEvent
): Promise<{ subscriptionId: string | null; error?: string }> {
  const { data } = event;
  const userId = data.custom_data?.user_id;

  if (!userId) {
    return { subscriptionId: null, error: 'No user_id in custom_data' };
  }

  const status = mapPaddleStatus(data.status);
  const tier = determineTier(data.items?.[0]?.price?.id, data.status);
  const entitlements = getEntitlementsJson(tier);

  // Check if subscription already exists for user
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (existingSub) {
    // Update existing subscription
    const { data: updated, error } = await supabase
      .from('subscriptions')
      .update({
        tier,
        status,
        paddle_customer_id: data.customer_id,
        paddle_subscription_id: data.id,
        paddle_price_id: data.items?.[0]?.price?.id,
        entitlements,
        trial_started_at: data.status === 'trialing' ? (data.started_at || new Date().toISOString()) : null,
        trial_ends_at:
          data.status === 'trialing' && data.current_billing_period?.ends_at
            ? data.current_billing_period.ends_at
            : null,
        current_period_start: data.current_billing_period?.starts_at,
        current_period_end: data.current_billing_period?.ends_at,
        plan_type:
          data.billing_cycle?.interval === 'year' ? 'annual' : 'monthly',
      })
      .eq('user_id', userId)
      .select('id')
      .single();

    if (error) {
      return { subscriptionId: null, error: error.message };
    }

    return { subscriptionId: updated?.id || null };
  }

  // Create new subscription
  const { data: created, error } = await supabase
    .from('subscriptions')
    .insert({
      user_id: userId,
      tier,
      status,
      paddle_customer_id: data.customer_id,
      paddle_subscription_id: data.id,
      paddle_price_id: data.items?.[0]?.price?.id,
      entitlements,
      trial_started_at: data.status === 'trialing' ? (data.started_at || new Date().toISOString()) : null,
      trial_ends_at:
        data.status === 'trialing' && data.current_billing_period?.ends_at
          ? data.current_billing_period.ends_at
          : null,
      current_period_start: data.current_billing_period?.starts_at,
      current_period_end: data.current_billing_period?.ends_at,
      plan_type: data.billing_cycle?.interval === 'year' ? 'annual' : 'monthly',
    })
    .select('id')
    .single();

  if (error) {
    return { subscriptionId: null, error: error.message };
  }

  return { subscriptionId: created?.id || null };
}

/**
 * Handle subscription.updated event
 */
async function handleSubscriptionUpdated(
  supabase: ReturnType<typeof getServiceClient>,
  event: PaddleWebhookEvent
): Promise<{ subscriptionId: string | null; error?: string }> {
  const { data } = event;

  const status = mapPaddleStatus(data.status);
  const tier = determineTier(data.items?.[0]?.price?.id, data.status);
  const entitlements = getEntitlementsJson(tier);

  const { data: updated, error } = await supabase
    .from('subscriptions')
    .update({
      tier,
      status,
      entitlements,
      paddle_price_id: data.items?.[0]?.price?.id,
      current_period_start: data.current_billing_period?.starts_at,
      current_period_end: data.current_billing_period?.ends_at,
      plan_type: data.billing_cycle?.interval === 'year' ? 'annual' : 'monthly',
    })
    .eq('paddle_subscription_id', data.id)
    .select('id')
    .single();

  if (error) {
    return { subscriptionId: null, error: error.message };
  }

  return { subscriptionId: updated?.id || null };
}

/**
 * Handle subscription.canceled event
 */
async function handleSubscriptionCanceled(
  supabase: ReturnType<typeof getServiceClient>,
  event: PaddleWebhookEvent
): Promise<{ subscriptionId: string | null; error?: string }> {
  const { data } = event;

  // Set status to canceled and revoke entitlements
  const { data: updated, error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      tier: 'free',
      entitlements: getEntitlementsJson('free'),
    })
    .eq('paddle_subscription_id', data.id)
    .select('id')
    .single();

  if (error) {
    return { subscriptionId: null, error: error.message };
  }

  return { subscriptionId: updated?.id || null };
}

/**
 * Handle subscription.past_due event
 */
async function handleSubscriptionPastDue(
  supabase: ReturnType<typeof getServiceClient>,
  event: PaddleWebhookEvent
): Promise<{ subscriptionId: string | null; error?: string }> {
  const { data } = event;

  // Set status to past_due but keep entitlements (grace period)
  const { data: updated, error } = await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
    })
    .eq('paddle_subscription_id', data.id)
    .select('id')
    .single();

  if (error) {
    return { subscriptionId: null, error: error.message };
  }

  return { subscriptionId: updated?.id || null };
}

/**
 * Handle subscription.activated event (trial converted to paid)
 */
async function handleSubscriptionActivated(
  supabase: ReturnType<typeof getServiceClient>,
  event: PaddleWebhookEvent
): Promise<{ subscriptionId: string | null; error?: string }> {
  const { data } = event;

  // Activated means trial converted to paid - status will be 'active'
  const tier = determineTier(data.items?.[0]?.price?.id, data.status);
  const entitlements = getEntitlementsJson(tier);

  const { data: updated, error } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      tier,
      entitlements,
      trial_ends_at: null, // Clear trial end since converted
      current_period_start: data.current_billing_period?.starts_at,
      current_period_end: data.current_billing_period?.ends_at,
    })
    .eq('paddle_subscription_id', data.id)
    .select('id')
    .single();

  if (error) {
    return { subscriptionId: null, error: error.message };
  }

  return { subscriptionId: updated?.id || null };
}

/**
 * Main webhook handler
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('paddle-signature');

    // Verify signature in production
    if (process.env.NODE_ENV === 'production') {
      if (!verifySignature(rawBody, signature)) {
        logger.warn('Invalid webhook signature');
        await sendSlackAlert('Invalid webhook signature', {
          signature: signature?.substring(0, 20) + '...',
        });
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    // Parse event
    const event: PaddleWebhookEvent = JSON.parse(rawBody);

    logger.info(`Processing Paddle webhook: ${event.event_type}`, {
      eventId: event.event_id,
      subscriptionId: event.data.id,
    });

    // Get service client
    const supabase = getServiceClient();

    // Check idempotency
    if (await isEventProcessed(supabase, event.event_id)) {
      logger.info(`Event already processed: ${event.event_id}`);
      return NextResponse.json({ success: true, message: 'Event already processed' });
    }

    // Process event based on type
    let result: { subscriptionId: string | null; error?: string };

    switch (event.event_type) {
      case 'subscription.created':
        result = await handleSubscriptionCreated(supabase, event);
        break;
      case 'subscription.updated':
        result = await handleSubscriptionUpdated(supabase, event);
        break;
      case 'subscription.canceled':
        result = await handleSubscriptionCanceled(supabase, event);
        break;
      case 'subscription.past_due':
        result = await handleSubscriptionPastDue(supabase, event);
        break;
      case 'subscription.activated':
        result = await handleSubscriptionActivated(supabase, event);
        break;
      case 'subscription.paused':
      case 'subscription.resumed':
        // Handle as update
        result = await handleSubscriptionUpdated(supabase, event);
        break;
      default:
        logger.warn(`Unhandled event type: ${event.event_type}`);
        result = { subscriptionId: null };
    }

    // Check for errors
    if (result.error) {
      logger.error(`Error processing webhook: ${result.error}`);
      await recordFailedEvent(supabase, event, result.error, { event });
      await sendSlackAlert(`Webhook processing failed: ${event.event_type}`, {
        eventId: event.event_id,
        error: result.error,
      });
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Record successful event
    await recordEvent(supabase, event, result.subscriptionId);

    const duration = Date.now() - startTime;
    logger.info(`Webhook processed successfully in ${duration}ms`, {
      eventId: event.event_id,
      eventType: event.event_type,
      subscriptionId: result.subscriptionId,
    });

    Sentry.addBreadcrumb({
      category: 'paddle_webhook',
      message: `Processed ${event.event_type}`,
      data: { eventId: event.event_id, duration },
      level: 'info',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Webhook handler error:', error);

    Sentry.captureException(error, {
      tags: { api: 'paddle_webhook' },
    });

    await sendSlackAlert('Webhook handler exception', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
