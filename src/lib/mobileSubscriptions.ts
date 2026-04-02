import { randomUUID } from 'crypto';
import { z } from 'zod';

import { getSubscriptionByUserId } from '@/lib/subscription';
import {
  DEFAULT_ENTITLEMENTS,
  type BillingProvider,
  type NormalizedMobileSubscription,
  type RevenueCatReconcileInput,
  type Subscription,
  type SubscriptionEntitlements,
  type SubscriptionInsert,
  type SubscriptionOffering,
  type SubscriptionTier,
} from '@/types/subscription';
import { createServiceClient } from '@/utils/supabase/service';

const subscriptionEntitlementsSchema = z.object({
  calendar_sync: z.boolean(),
  full_history: z.boolean(),
  full_recommendations: z.boolean(),
  unlimited_bookmarks: z.boolean(),
});

export const revenueCatReconcileSchema = z.object({
  customerId: z.string().trim().min(1, 'customerId is required'),
  entitlementId: z.string().trim().min(1, 'entitlementId is required'),
  productId: z.string().trim().min(1, 'productId is required'),
  tier: z.enum(['free', 'pro', 'team']),
  status: z.enum(['active', 'trialing', 'past_due', 'canceled', 'expired']),
  planType: z.enum(['monthly', 'annual']).nullable().optional(),
  currentPeriodStart: z.string().datetime().nullable().optional(),
  currentPeriodEnd: z.string().datetime().nullable().optional(),
  trialStartedAt: z.string().datetime().nullable().optional(),
  trialEndsAt: z.string().datetime().nullable().optional(),
  pastDueAt: z.string().datetime().nullable().optional(),
  entitlements: subscriptionEntitlementsSchema.partial().nullable().optional(),
});

function cloneEntitlements(
  tier: SubscriptionTier,
  overrides?: Partial<SubscriptionEntitlements> | null
): SubscriptionEntitlements {
  return {
    ...DEFAULT_ENTITLEMENTS[tier],
    ...(overrides ?? {}),
  };
}

function normalizeBillingProvider(provider: string | null | undefined): BillingProvider {
  if (provider === 'manual' || provider === 'revenuecat') {
    return provider;
  }

  return 'paddle';
}

function normalizeConfiguredValue(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function toNormalizedSubscription(
  subscription: Subscription | null,
  userId: string
): NormalizedMobileSubscription {
  if (!subscription) {
    return {
      id: userId,
      userId,
      provider: 'manual',
      tier: 'free',
      status: 'canceled',
      planType: null,
      entitlements: cloneEntitlements('free'),
      trialEndsAt: null,
      currentPeriodEnd: null,
      providerCustomerId: null,
      providerProductId: null,
    };
  }

  const provider = normalizeBillingProvider(subscription.billing_provider);
  const providerCustomerId =
    provider === 'revenuecat'
      ? subscription.revenuecat_customer_id
      : subscription.paddle_customer_id;
  const providerProductId =
    provider === 'revenuecat'
      ? subscription.revenuecat_product_id
      : subscription.paddle_price_id;

  return {
    id: subscription.id,
    userId: subscription.user_id,
    provider,
    tier: subscription.tier,
    status: subscription.status,
    planType: subscription.plan_type,
    entitlements: cloneEntitlements(
      subscription.tier,
      subscription.entitlements as unknown as SubscriptionEntitlements
    ),
    trialEndsAt: subscription.trial_ends_at,
    currentPeriodEnd: subscription.current_period_end,
    providerCustomerId: providerCustomerId ?? null,
    providerProductId: providerProductId ?? null,
  };
}

export async function getNormalizedSubscriptionForUser(
  userId: string
): Promise<NormalizedMobileSubscription> {
  const subscription = await getSubscriptionByUserId(userId);
  return toNormalizedSubscription(subscription, userId);
}

export function buildRevenueCatSubscriptionInsert(
  userId: string,
  payload: RevenueCatReconcileInput,
  now = new Date().toISOString()
): SubscriptionInsert {
  return {
    id: randomUUID(),
    user_id: userId,
    billing_provider: 'revenuecat',
    revenuecat_customer_id: payload.customerId,
    revenuecat_entitlement_id: payload.entitlementId,
    revenuecat_product_id: payload.productId,
    tier: payload.tier,
    status: payload.status,
    plan_type: payload.planType ?? null,
    current_period_start: payload.currentPeriodStart ?? null,
    current_period_end: payload.currentPeriodEnd ?? null,
    trial_started_at: payload.trialStartedAt ?? null,
    trial_ends_at: payload.trialEndsAt ?? null,
    past_due_at: payload.pastDueAt ?? null,
    entitlements: cloneEntitlements(
      payload.tier,
      payload.entitlements
    ) as unknown as SubscriptionInsert['entitlements'],
    seats_included: payload.tier === 'team' ? 5 : 1,
    seats_used: 1,
    updated_at: now,
  };
}

function getSubscriptionServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('RevenueCat reconciliation is not configured.');
  }

  return createServiceClient(supabaseUrl, serviceRoleKey);
}

export async function reconcileRevenueCatSubscription(
  userId: string,
  payload: RevenueCatReconcileInput
): Promise<NormalizedMobileSubscription> {
  const serviceClient = getSubscriptionServiceClient();
  const upsertPayload = buildRevenueCatSubscriptionInsert(userId, payload);
  const { data, error } = await serviceClient
    .from('subscriptions')
    .upsert(upsertPayload, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to reconcile RevenueCat subscription.');
  }

  return toNormalizedSubscription(data, userId);
}

export function getMobileSubscriptionOfferings(): SubscriptionOffering[] {
  const monthlyProductIdentifier =
    normalizeConfiguredValue(process.env.REVENUECAT_PRO_MONTHLY_PRODUCT_ID) ??
    normalizeConfiguredValue(process.env.EXPO_PUBLIC_REVENUECAT_PRO_MONTHLY_PRODUCT_ID);
  const annualProductIdentifier =
    normalizeConfiguredValue(process.env.REVENUECAT_PRO_ANNUAL_PRODUCT_ID) ??
    normalizeConfiguredValue(process.env.EXPO_PUBLIC_REVENUECAT_PRO_ANNUAL_PRODUCT_ID);

  return [
    monthlyProductIdentifier
      ? {
          identifier: 'pro-monthly',
          productIdentifier: monthlyProductIdentifier,
          title: 'Pro Monthly',
          description: 'Monthly access to recommendations, history, and calendar sync.',
          tier: 'pro',
          planType: 'monthly',
        }
      : null,
    annualProductIdentifier
      ? {
          identifier: 'pro-annual',
          productIdentifier: annualProductIdentifier,
          title: 'Pro Annual',
          description: 'Annual access to recommendations, history, and calendar sync.',
          tier: 'pro',
          planType: 'annual',
        }
      : null,
  ].filter((offering): offering is SubscriptionOffering => offering !== null);
}
