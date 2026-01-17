import { createClient } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';
import {
  DEFAULT_ENTITLEMENTS,
  PADDLE_STATUS_MAP,
  type SubscriptionStatus,
  type SubscriptionTier,
} from '@/types/subscription';
import type { Database, Json } from '@/types/supabase';
import { PADDLE_PRICES } from '@/lib/paddle';

// Environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create Supabase client with service role
function getServiceClient() {
  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

// Paddle webhook event types
export type PaddleEventType =
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.canceled'
  | 'subscription.past_due'
  | 'subscription.activated'
  | 'subscription.paused'
  | 'subscription.resumed'
  | 'subscription.trialing';

export interface PaddleWebhookEvent {
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

/**
 * Map Paddle status to our subscription status
 */
function mapPaddleStatus(paddleStatus: string): SubscriptionStatus {
  return PADDLE_STATUS_MAP[paddleStatus] || 'canceled';
}

/**
 * Determine tier based on price ID and status
 */
function determineTier(priceId: string | undefined, status?: string): SubscriptionTier {
  if (priceId) {
    if (priceId === PADDLE_PRICES.team_monthly || priceId === PADDLE_PRICES.team_annual) {
      return 'team';
    }
  }

  if (status === 'trialing') {
    return 'pro';
  }
  
  if (priceId) {
    return 'pro';
  }
  return 'free';
}

/**
 * Get entitlements as Json type
 */
function getEntitlementsJson(tier: SubscriptionTier): Json {
  return DEFAULT_ENTITLEMENTS[tier] as unknown as Json;
}

/**
 * Handle subscription.created
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
    .maybeSingle();

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
 * Handle subscription.updated
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
 * Handle subscription.canceled
 */
async function handleSubscriptionCanceled(
  supabase: ReturnType<typeof getServiceClient>,
  event: PaddleWebhookEvent
): Promise<{ subscriptionId: string | null; error?: string }> {
  const { data } = event;

  // Fetch existing subscription to check current entitlement status/dates
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('current_period_end')
    .eq('paddle_subscription_id', data.id)
    .single();

  // Determine if we should revoke access immediately
  // Fallback to existing DB date if webhook doesn't provide it
  let shouldRevoke = true;
  const endsAtString = data.current_billing_period?.ends_at || existingSub?.current_period_end;
  
  if (endsAtString) {
    const endsAt = new Date(endsAtString).getTime();
    if (endsAt > Date.now()) { // Explicitly check if ends_at is in the future
       logger.info('Subscription canceled with time remaining. Maintaining access until period end.', {
         subscriptionId: data.id,
         endsAt: endsAtString
       });
       shouldRevoke = false;
    }
  }

  // Set status to canceled. If revocable, downgrade to free.
  // If not revocable, just update status (and ensure dates are set), but keep tier/entitlements.
  const updatePayload: any = {
      status: 'canceled',
  };

  // Only update billing dates if provided in payload to avoid clearing valid dates
  if (data.current_billing_period) {
      updatePayload.current_period_start = data.current_billing_period.starts_at;
      updatePayload.current_period_end = data.current_billing_period.ends_at;
  }

  if (shouldRevoke) {
      updatePayload.tier = 'free';
      updatePayload.entitlements = getEntitlementsJson('free');
  }

  const { data: updated, error } = await supabase
    .from('subscriptions')
    .update(updatePayload)
    .eq('paddle_subscription_id', data.id)
    .select('id')
    .single();

  if (error) {
    return { subscriptionId: null, error: error.message };
  }

  return { subscriptionId: updated?.id || null };
}

/**
 * Handle subscription.past_due
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
      past_due_at: event.occurred_at,
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
 * Handle subscription.activated
 */
async function handleSubscriptionActivated(
  supabase: ReturnType<typeof getServiceClient>,
  event: PaddleWebhookEvent
): Promise<{ subscriptionId: string | null; error?: string }> {
  const { data } = event;

  const tier = determineTier(data.items?.[0]?.price?.id, data.status);
  const entitlements = getEntitlementsJson(tier);

  const { data: updated, error } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      tier,
      entitlements,
      trial_ends_at: null,
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
 * Main service method to process a Paddle webhook event
 */
export async function processPaddleEvent(event: PaddleWebhookEvent): Promise<{ subscriptionId: string | null; error?: string }> {
  const supabase = getServiceClient();
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
    case 'subscription.trialing':
      result = await handleSubscriptionUpdated(supabase, event);
      break;
    default:
      logger.warn(`Unhandled event type: ${event.event_type}`);
      result = { subscriptionId: null };
  }

  return result;
}
