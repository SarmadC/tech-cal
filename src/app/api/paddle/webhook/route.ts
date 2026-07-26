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
import { processPaddleEvent, type PaddleWebhookEvent } from '@/services/paddleWebhookService';
import { getPostHogClient } from '@/lib/posthog-server';
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
    // The signed payload format is: timestamp:rawBody
    const signedPayload = `${timestamp}:${payload}`;
    const expectedSignature = crypto
      .createHmac('sha256', PADDLE_WEBHOOK_SECRET)
      .update(signedPayload)
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
 * Main webhook handler
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('paddle-signature');

    // Always verify webhook signature to prevent forged events
    if (!verifySignature(rawBody, signature)) {
      logger.warn('Invalid webhook signature');
      await sendSlackAlert('Invalid webhook signature', {
        signature: signature?.substring(0, 20) + '...',
      });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
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

    // Process event using service
    const result = await processPaddleEvent(event);

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

    // Track subscription events in PostHog for key lifecycle events
    try {
      const posthog = getPostHogClient();
      const customerId = event.data.customer_id;

      if (event.event_type === 'subscription.activated') {
        posthog.capture({
          distinctId: customerId || event.event_id,
          event: 'subscription_activated',
          properties: {
            subscription_id: event.data.id,
            billing_cycle: event.data.billing_cycle?.interval || 'unknown',
            status: event.data.status,
            paddle_event_id: event.event_id,
            source: 'paddle_webhook',
          }
        });
      } else if (event.event_type === 'subscription.canceled') {
        posthog.capture({
          distinctId: customerId || event.event_id,
          event: 'subscription_canceled',
          properties: {
            subscription_id: event.data.id,
            status: event.data.status,
            paddle_event_id: event.event_id,
            source: 'paddle_webhook',
          }
        });
      }
    } catch (posthogError) {
      // Don't fail webhook processing if PostHog tracking fails
      logger.error('[PostHog] Failed to track subscription event:', posthogError);
    }

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
