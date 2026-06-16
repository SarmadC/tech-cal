import { randomUUID } from "crypto";
import { z } from "zod";

import {
  DEFAULT_ENTITLEMENTS,
  revenueCatReconcileSchema,
  type BillingProvider,
  type NormalizedSubscription,
  type RevenueCatReconcileInput,
  type SubscriptionEntitlements,
  type SubscriptionOffering,
  type SubscriptionTier,
} from "@kurecal/domain";

import { getSubscriptionByUserId } from "@/lib/subscription";
import type {
  Subscription,
  SubscriptionInsert,
  SubscriptionUpdate,
} from "@/types/subscription";
import type { Json } from "@/types/supabase";
import { createServiceClient } from "@/utils/supabase/service";

export { revenueCatReconcileSchema };

const REVENUECAT_EVENT_ID_PREFIX = "revenuecat:";
const REVENUECAT_PRO_ENTITLEMENT_ID =
  process.env.REVENUECAT_PRO_ENTITLEMENT_ID ??
  process.env.EXPO_PUBLIC_REVENUECAT_PRO_ENTITLEMENT_ID ??
  "kure_cal_pro";
const REVENUECAT_ACTIVE_EVENT_TYPES = new Set([
  "INITIAL_PURCHASE",
  "NON_RENEWING_PURCHASE",
  "PRODUCT_CHANGE",
  "RENEWAL",
  "SUBSCRIPTION_EXTENDED",
  "UNCANCELLATION",
]);
const REVENUECAT_CANCELED_EVENT_TYPES = new Set(["CANCELLATION"]);
const REVENUECAT_EXPIRED_EVENT_TYPES = new Set(["EXPIRATION"]);
const REVENUECAT_PAST_DUE_EVENT_TYPES = new Set(["BILLING_ISSUE"]);
const REVENUECAT_IGNORED_EVENT_TYPES = new Set(["TEST", "TRANSFER"]);

const revenueCatWebhookEventSchema = z
  .object({
    aliases: z.array(z.string()).nullable().optional(),
    app_user_id: z.string().nullable().optional(),
    entitlement_id: z.string().nullable().optional(),
    entitlement_ids: z.array(z.string()).nullable().optional(),
    event_timestamp_ms: z.number().int().nonnegative(),
    expiration_at_ms: z.number().int().nonnegative().nullable().optional(),
    id: z.string().min(1),
    new_product_id: z.string().nullable().optional(),
    original_app_user_id: z.string().nullable().optional(),
    period_type: z.string().nullable().optional(),
    product_id: z.string().nullable().optional(),
    purchased_at_ms: z.number().int().nonnegative().nullable().optional(),
    store: z.string().nullable().optional(),
    transferred_to: z.array(z.string()).nullable().optional(),
    type: z.string().min(1),
  })
  .passthrough();

export const revenueCatWebhookEnvelopeSchema = z
  .object({
    api_version: z.string().optional(),
    event: revenueCatWebhookEventSchema,
  })
  .passthrough();

export type RevenueCatWebhookEnvelope = z.infer<
  typeof revenueCatWebhookEnvelopeSchema
>;
export type RevenueCatWebhookEvent = z.infer<
  typeof revenueCatWebhookEventSchema
>;

function cloneEntitlements(
  tier: SubscriptionTier,
  overrides?: Partial<SubscriptionEntitlements> | null,
): SubscriptionEntitlements {
  return {
    ...DEFAULT_ENTITLEMENTS[tier],
    ...(overrides ?? {}),
  };
}

function normalizeBillingProvider(
  provider: string | null | undefined,
): BillingProvider {
  if (provider === "manual" || provider === "revenuecat") {
    return provider;
  }

  return "paddle";
}

function normalizeConfiguredValue(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function dateFromRevenueCatMs(value: number | null | undefined): string | null {
  if (typeof value !== "number") {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function planTypeFromProductId(productId: string): "annual" | "monthly" {
  const normalized = productId.toLowerCase();
  return normalized.includes("year") || normalized.includes("annual")
    ? "annual"
    : "monthly";
}

function revenueCatStatusFromEvent(
  event: RevenueCatWebhookEvent,
): RevenueCatReconcileInput["status"] {
  if (REVENUECAT_EXPIRED_EVENT_TYPES.has(event.type)) {
    return "expired";
  }

  if (REVENUECAT_PAST_DUE_EVENT_TYPES.has(event.type)) {
    return "past_due";
  }

  if (REVENUECAT_CANCELED_EVENT_TYPES.has(event.type)) {
    return "canceled";
  }

  return event.period_type === "TRIAL" ? "trialing" : "active";
}

function revenueCatTierFromEvent(
  event: RevenueCatWebhookEvent,
): RevenueCatReconcileInput["tier"] {
  return REVENUECAT_EXPIRED_EVENT_TYPES.has(event.type) ? "free" : "pro";
}

function isRevenueCatLifecycleEvent(event: RevenueCatWebhookEvent): boolean {
  return (
    REVENUECAT_ACTIVE_EVENT_TYPES.has(event.type) ||
    REVENUECAT_CANCELED_EVENT_TYPES.has(event.type) ||
    REVENUECAT_EXPIRED_EVENT_TYPES.has(event.type) ||
    REVENUECAT_PAST_DUE_EVENT_TYPES.has(event.type)
  );
}

function isUuid(value: string | null | undefined): value is string {
  if (!value) {
    return false;
  }

  return z.string().uuid().safeParse(value).success;
}

function revenueCatUserIdCandidates(event: RevenueCatWebhookEvent): string[] {
  return [
    event.app_user_id,
    event.original_app_user_id,
    ...(event.aliases ?? []),
    ...(event.transferred_to ?? []),
  ].filter((value): value is string => typeof value === "string");
}

export function resolveRevenueCatWebhookUserId(
  event: RevenueCatWebhookEvent,
): string | null {
  return revenueCatUserIdCandidates(event).find(isUuid) ?? null;
}

export function buildRevenueCatReconcileInputFromWebhookEvent(
  event: RevenueCatWebhookEvent,
): RevenueCatReconcileInput | null {
  if (
    REVENUECAT_IGNORED_EVENT_TYPES.has(event.type) ||
    !isRevenueCatLifecycleEvent(event)
  ) {
    return null;
  }

  const productId = event.new_product_id ?? event.product_id;
  if (!productId) {
    return null;
  }

  const entitlementId =
    event.entitlement_ids?.[0] ??
    event.entitlement_id ??
    REVENUECAT_PRO_ENTITLEMENT_ID;
  const customerId =
    event.app_user_id ??
    event.original_app_user_id ??
    resolveRevenueCatWebhookUserId(event);
  if (!customerId) {
    return null;
  }

  const tier = revenueCatTierFromEvent(event);
  const isTrial = event.period_type === "TRIAL";

  return {
    currentPeriodEnd: dateFromRevenueCatMs(event.expiration_at_ms),
    currentPeriodStart: dateFromRevenueCatMs(event.purchased_at_ms),
    customerId,
    entitlementId,
    entitlements: cloneEntitlements(tier),
    pastDueAt:
      event.type === "BILLING_ISSUE"
        ? dateFromRevenueCatMs(event.event_timestamp_ms)
        : null,
    planType: planTypeFromProductId(productId),
    productId,
    status: revenueCatStatusFromEvent(event),
    tier,
    trialEndsAt: isTrial ? dateFromRevenueCatMs(event.expiration_at_ms) : null,
    trialStartedAt: isTrial
      ? dateFromRevenueCatMs(event.purchased_at_ms)
      : null,
  };
}

function parseDateTime(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

export function isRevenueCatWebhookEventStale(
  existing: Subscription | null,
  event: RevenueCatWebhookEvent,
  payload: RevenueCatReconcileInput,
): boolean {
  if (
    !existing ||
    normalizeBillingProvider(existing.billing_provider) !== "revenuecat"
  ) {
    return false;
  }

  const incomingPeriodEnd = parseDateTime(payload.currentPeriodEnd);
  const existingPeriodEnd = parseDateTime(existing.current_period_end);
  if (
    incomingPeriodEnd !== null &&
    existingPeriodEnd !== null &&
    incomingPeriodEnd < existingPeriodEnd
  ) {
    return true;
  }

  const isExistingTerminal =
    existing.status === "canceled" ||
    existing.status === "expired" ||
    existing.status === "past_due";
  const incomingReactivates =
    payload.status === "active" || payload.status === "trialing";

  return (
    incomingPeriodEnd !== null &&
    existingPeriodEnd !== null &&
    incomingPeriodEnd === existingPeriodEnd &&
    isExistingTerminal &&
    incomingReactivates &&
    event.type !== "UNCANCELLATION"
  );
}

function buildRevenueCatSubscriptionWritePayload(
  payload: RevenueCatReconcileInput,
  existing: Subscription | null,
  now = new Date().toISOString(),
): SubscriptionUpdate {
  return {
    billing_provider: "revenuecat",
    current_period_end: payload.currentPeriodEnd ?? null,
    current_period_start: payload.currentPeriodStart ?? null,
    entitlements: cloneEntitlements(
      payload.tier,
      payload.entitlements,
    ) as unknown as SubscriptionUpdate["entitlements"],
    past_due_at: payload.pastDueAt ?? null,
    plan_type: payload.planType ?? null,
    revenuecat_customer_id: payload.customerId,
    revenuecat_entitlement_id: payload.entitlementId,
    revenuecat_product_id: payload.productId,
    seats_included: payload.tier === "team" ? 5 : 1,
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
    throw new Error("RevenueCat reconciliation is not configured.");
  }

  return createServiceClient(supabaseUrl, serviceRoleKey);
}

export function toNormalizedSubscription(
  subscription: Subscription | null,
  userId: string,
): NormalizedSubscription {
  if (!subscription) {
    return {
      currentPeriodEnd: null,
      entitlements: cloneEntitlements("free"),
      id: userId,
      planType: null,
      provider: "manual",
      providerCustomerId: null,
      providerProductId: null,
      status: "canceled",
      tier: "free",
      trialEndsAt: null,
      userId,
    };
  }

  const provider = normalizeBillingProvider(subscription.billing_provider);
  const providerCustomerId =
    provider === "revenuecat"
      ? subscription.revenuecat_customer_id
      : subscription.paddle_customer_id;
  const providerProductId =
    provider === "revenuecat"
      ? subscription.revenuecat_product_id
      : subscription.paddle_price_id;

  return {
    currentPeriodEnd: subscription.current_period_end,
    entitlements: cloneEntitlements(
      subscription.tier,
      subscription.entitlements as unknown as SubscriptionEntitlements,
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
  userId: string,
): Promise<NormalizedSubscription> {
  const subscription = await getSubscriptionByUserId(userId);
  return toNormalizedSubscription(subscription, userId);
}

export function buildRevenueCatSubscriptionInsert(
  userId: string,
  payload: RevenueCatReconcileInput,
  now = new Date().toISOString(),
): SubscriptionInsert {
  return {
    ...buildRevenueCatSubscriptionWritePayload(payload, null, now),
    id: randomUUID(),
    user_id: userId,
  };
}

export async function reconcileRevenueCatSubscription(
  userId: string,
  payload: RevenueCatReconcileInput,
): Promise<NormalizedSubscription> {
  const serviceClient = getSubscriptionServiceClient();
  const { data: existingSubscription, error: existingSubscriptionError } =
    await serviceClient
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

  if (existingSubscriptionError) {
    throw new Error(
      existingSubscriptionError.message ??
        "Failed to load the existing subscription.",
    );
  }

  const writePayload = buildRevenueCatSubscriptionWritePayload(
    payload,
    existingSubscription,
    new Date().toISOString(),
  );

  const writeOperation = existingSubscription
    ? serviceClient
        .from("subscriptions")
        .update(writePayload)
        .eq("id", existingSubscription.id)
        .select("*")
        .single()
    : serviceClient
        .from("subscriptions")
        .insert({
          ...writePayload,
          id: randomUUID(),
          user_id: userId,
        })
        .select("*")
        .single();

  const { data, error } = await writeOperation;

  if (error || !data) {
    throw new Error(
      error?.message ?? "Failed to reconcile RevenueCat subscription.",
    );
  }

  return toNormalizedSubscription(data, userId);
}

async function isRevenueCatWebhookEventProcessed(
  serviceClient: ReturnType<typeof getSubscriptionServiceClient>,
  eventId: string,
): Promise<boolean> {
  const { data } = await serviceClient
    .from("subscription_events")
    .select("id")
    .eq("paddle_event_id", `${REVENUECAT_EVENT_ID_PREFIX}${eventId}`)
    .maybeSingle();

  return Boolean(data);
}

async function recordRevenueCatWebhookEvent(
  serviceClient: ReturnType<typeof getSubscriptionServiceClient>,
  envelope: RevenueCatWebhookEnvelope,
  subscriptionId: string | null,
): Promise<void> {
  await serviceClient.from("subscription_events").insert({
    paddle_event_id: `${REVENUECAT_EVENT_ID_PREFIX}${envelope.event.id}`,
    event_type: `revenuecat.${envelope.event.type}`,
    payload: envelope as unknown as Json,
    subscription_id: subscriptionId,
  });
}

export async function processRevenueCatWebhookEvent(
  envelope: RevenueCatWebhookEnvelope,
): Promise<NormalizedSubscription | null> {
  const event = envelope.event;
  const userId = resolveRevenueCatWebhookUserId(event);
  const payload = buildRevenueCatReconcileInputFromWebhookEvent(event);

  if (!userId || !payload) {
    return null;
  }

  const serviceClient = getSubscriptionServiceClient();
  const alreadyProcessed = await isRevenueCatWebhookEventProcessed(
    serviceClient,
    event.id,
  );
  if (alreadyProcessed) {
    return getNormalizedSubscriptionForUser(userId);
  }

  const existingSubscription = await getSubscriptionByUserId(userId);
  if (isRevenueCatWebhookEventStale(existingSubscription, event, payload)) {
    await recordRevenueCatWebhookEvent(
      serviceClient,
      envelope,
      existingSubscription?.id ?? null,
    );
    return toNormalizedSubscription(existingSubscription, userId);
  }

  const subscription = await reconcileRevenueCatSubscription(userId, payload);
  await recordRevenueCatWebhookEvent(serviceClient, envelope, subscription.id);

  return subscription;
}

export function getMobileSubscriptionOfferings(): SubscriptionOffering[] {
  const monthlyProductIdentifier =
    normalizeConfiguredValue(process.env.REVENUECAT_PRO_MONTHLY_PRODUCT_ID) ??
    normalizeConfiguredValue(
      process.env.EXPO_PUBLIC_REVENUECAT_PRO_MONTHLY_PRODUCT_ID,
    );
  const annualProductIdentifier =
    normalizeConfiguredValue(process.env.REVENUECAT_PRO_ANNUAL_PRODUCT_ID) ??
    normalizeConfiguredValue(
      process.env.EXPO_PUBLIC_REVENUECAT_PRO_ANNUAL_PRODUCT_ID,
    );

  return [
    monthlyProductIdentifier
      ? {
          description:
            "Monthly access to recommendations, history, and calendar sync.",
          identifier: "pro-monthly",
          planType: "monthly",
          productIdentifier: monthlyProductIdentifier,
          tier: "pro",
          title: "Pro Monthly",
        }
      : null,
    annualProductIdentifier
      ? {
          description:
            "Annual access to recommendations, history, and calendar sync.",
          identifier: "pro-annual",
          planType: "annual",
          productIdentifier: annualProductIdentifier,
          tier: "pro",
          title: "Pro Annual",
        }
      : null,
  ].filter((offering): offering is SubscriptionOffering => offering !== null);
}
