import { randomUUID } from 'crypto';

import {
  DEFAULT_ENTITLEMENTS,
  revenueCatReconcileSchema,
  type BillingProvider,
  type NormalizedSubscription,
  type RevenueCatReconcileInput,
  type SubscriptionEntitlements,
  type SubscriptionOffering,
  type SubscriptionTier,
} from '@kurecal/domain';

import { getSubscriptionByUserId } from '@/lib/subscription';
import type {
  Subscription,
  SubscriptionInsert,
  SubscriptionUpdate,
} from '@/types/subscription';
import { createServiceClient } from '@/utils/supabase/service';

export { revenueCatReconcileSchema };

function cloneEntitlements(
  tier: SubscriptionTier,
  overrides?: Partial<SubscriptionEntitlements> | null
): SubscriptionEntitlements {
  return {
    ...DEFAULT_ENTITLEMENTS[tier],
    ...(overrides ?? {}),
  };
}

function normalizeBillingProvider(
  provider: string | null | undefined
): BillingProvider {
  if (provider === 'manual' || provider === 'revenuecat') {
    return provider;
  }

  return 'paddle';
}

function normalizeConfiguredValue(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function buildRevenueCatSubscriptionWritePayload(
  payload: RevenueCatReconcileInput,
  existing: Subscription | null,
  now = new Date().toISOString()
): SubscriptionUpdate {
  return {
    billing_provider: 'revenuecat',
    current_period_end: payload.currentPeriodEnd ?? null,
    current_period_start: payload.currentPeriodStart ?? null,
    entitlements: cloneEntitlements(
      payload.tier,
      payload.entitlements
    ) as unknown as SubscriptionUpdate['entitlements'],
    past_due_at: payload.pastDueAt ?? null,
    plan_type: payload.planType ?? null,
    revenuecat_customer_id: payload.customerId,
    revenuecat_entitlement_id: payload.entitlementId,
    revenuecat_product_id: payload.productId,
    seats_included: payload.tier === 'team' ? 5 : 1,
    seats_used: existing?.seats_used ?? 1,
    status: payload.status,
    tier: payload.tier,
    trial_ends_at: payload.trialEndsAt ?? null,
    trial_started_at: payload.trialStartedAt ?? null,
    updated_at: now,
  };
}

function getSubscriptionServiceClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('RevenueCat reconciliation is not configured.');
  }

  return createServiceClient(supabaseUrl, serviceRoleKey);
}

export function toNormalizedSubscription(
  subscription: Subscription | null,
  userId: string
): NormalizedSubscription {
  if (!subscription) {
    return {
      currentPeriodEnd: null,
      entitlements: cloneEntitlements('free'),
      id: userId,
      planType: null,
      provider: 'manual',
      providerCustomerId: null,
      providerProductId: null,
      status: 'canceled',
      tier: 'free',
      trialEndsAt: null,
      userId,
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
    currentPeriodEnd: subscription.current_period_end,
    entitlements: cloneEntitlements(
      subscription.tier,
      subscription.entitlements as unknown as SubscriptionEntitlements
    ),
    id: subscription.id,
    planType: subscription.plan_type,
    provider,
    providerCustomerId: providerCustomerId ?? null,
    providerProductId: providerProductId ?? null,
    status: subscription.status,
    tier: subscription.tier,
    trialEndsAt: subscription.trial_ends_at,
    userId: subscription.user_id,
  };
}

export async function getNormalizedSubscriptionForUser(
  userId: string
): Promise<NormalizedSubscription> {
  const subscription = await getSubscriptionByUserId(userId);
  return toNormalizedSubscription(subscription, userId);
}

export function buildRevenueCatSubscriptionInsert(
  userId: string,
  payload: RevenueCatReconcileInput,
  now = new Date().toISOString()
): SubscriptionInsert {
  return {
    ...buildRevenueCatSubscriptionWritePayload(payload, null, now),
    id: randomUUID(),
    user_id: userId,
  };
}

export async function reconcileRevenueCatSubscription(
  userId: string,
  payload: RevenueCatReconcileInput
): Promise<NormalizedSubscription> {
  const serviceClient = getSubscriptionServiceClient();
  const {
    data: existingSubscription,
    error: existingSubscriptionError,
  } = await serviceClient
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (existingSubscriptionError) {
    throw new Error(
      existingSubscriptionError.message ??
        'Failed to load the existing subscription.'
    );
  }

  const writePayload = buildRevenueCatSubscriptionWritePayload(
    payload,
    existingSubscription,
    new Date().toISOString()
  );

  const writeOperation = existingSubscription
    ? serviceClient
        .from('subscriptions')
        .update(writePayload)
        .eq('id', existingSubscription.id)
        .select('*')
        .single()
    : serviceClient
        .from('subscriptions')
        .insert({
          ...writePayload,
          id: randomUUID(),
          user_id: userId,
        })
        .select('*')
        .single();

  const { data, error } = await writeOperation;

  if (error || !data) {
    throw new Error(
      error?.message ?? 'Failed to reconcile RevenueCat subscription.'
    );
  }

  return toNormalizedSubscription(data, userId);
}

export function getMobileSubscriptionOfferings(): SubscriptionOffering[] {
  const monthlyProductIdentifier =
    normalizeConfiguredValue(process.env.REVENUECAT_PRO_MONTHLY_PRODUCT_ID) ??
    normalizeConfiguredValue(
      process.env.EXPO_PUBLIC_REVENUECAT_PRO_MONTHLY_PRODUCT_ID
    );
  const annualProductIdentifier =
    normalizeConfiguredValue(process.env.REVENUECAT_PRO_ANNUAL_PRODUCT_ID) ??
    normalizeConfiguredValue(
      process.env.EXPO_PUBLIC_REVENUECAT_PRO_ANNUAL_PRODUCT_ID
    );

  return [
    monthlyProductIdentifier
      ? {
          description:
            'Monthly access to recommendations, history, and calendar sync.',
          identifier: 'pro-monthly',
          planType: 'monthly',
          productIdentifier: monthlyProductIdentifier,
          tier: 'pro',
          title: 'Pro Monthly',
        }
      : null,
    annualProductIdentifier
      ? {
          description:
            'Annual access to recommendations, history, and calendar sync.',
          identifier: 'pro-annual',
          planType: 'annual',
          productIdentifier: annualProductIdentifier,
          tier: 'pro',
          title: 'Pro Annual',
        }
      : null,
  ].filter((offering): offering is SubscriptionOffering => offering !== null);
}
