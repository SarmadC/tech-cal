import { randomUUID } from 'crypto';
import type {
  NormalizedSubscription,
  RevenueCatReconcileInput,
  SubscriptionEntitlements,
  SubscriptionOffering,
} from '@kurecal/domain';
import type { Subscription, SubscriptionTier } from '@/types/subscription';
import { DEFAULT_ENTITLEMENTS } from '@/types/subscription';
import { getSubscriptionByUserId } from '@/lib/subscription';
import { createServiceClient } from '@/utils/supabase/service';

function cloneEntitlements(
  tier: SubscriptionTier,
  overrides?: SubscriptionEntitlements | null
): SubscriptionEntitlements {
  return {
    ...DEFAULT_ENTITLEMENTS[tier],
    ...(overrides ?? {}),
  };
}

export function toNormalizedSubscription(
  subscription: Subscription | null,
  userId: string
): NormalizedSubscription {
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

  const provider = subscription.billing_provider ?? 'paddle';
  const providerCustomerId =
    provider === 'revenuecat'
      ? subscription.revenuecat_customer_id ?? null
      : subscription.paddle_customer_id ?? null;
  const providerProductId =
    provider === 'revenuecat'
      ? subscription.revenuecat_product_id ?? null
      : subscription.paddle_price_id ?? null;

  return {
    id: subscription.id,
    userId: subscription.user_id,
    provider,
    tier: subscription.tier,
    status: subscription.status,
    planType: subscription.plan_type,
    entitlements: cloneEntitlements(
      subscription.tier,
      subscription.entitlements as SubscriptionEntitlements
    ),
    trialEndsAt: subscription.trial_ends_at,
    currentPeriodEnd: subscription.current_period_end,
    providerCustomerId,
    providerProductId,
  };
}

export async function getNormalizedSubscriptionForUser(
  userId: string
): Promise<NormalizedSubscription> {
  const subscription = await getSubscriptionByUserId(userId);
  return toNormalizedSubscription(subscription, userId);
}

export async function reconcileRevenueCatSubscription(
  userId: string,
  payload: RevenueCatReconcileInput
): Promise<NormalizedSubscription> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('RevenueCat reconciliation is not configured.');
  }

  const serviceClient = createServiceClient(supabaseUrl, serviceRoleKey);
  const now = new Date().toISOString();
  const upsertPayload = {
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
    entitlements: cloneEntitlements(payload.tier, payload.entitlements),
    seats_included: payload.tier === 'team' ? 5 : 1,
    seats_used: 1,
    updated_at: now,
  };

  const { data, error } = await (serviceClient as any)
    .from('subscriptions')
    .upsert(upsertPayload, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message ?? 'Failed to reconcile RevenueCat subscription.');
  }

  return toNormalizedSubscription(data as Subscription, userId);
}

export function getMobileSubscriptionOfferings(): SubscriptionOffering[] {
  const monthlyProductIdentifier =
    process.env.REVENUECAT_PRO_MONTHLY_PRODUCT_ID ??
    process.env.EXPO_PUBLIC_REVENUECAT_PRO_MONTHLY_PRODUCT_ID;
  const annualProductIdentifier =
    process.env.REVENUECAT_PRO_ANNUAL_PRODUCT_ID ??
    process.env.EXPO_PUBLIC_REVENUECAT_PRO_ANNUAL_PRODUCT_ID;

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
