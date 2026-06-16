import { Linking, Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import RevenueCatUI from 'react-native-purchases-ui';

import type {
  RevenueCatReconcileInput,
  SubscriptionStatus,
} from '@kurecal/domain';

import {
  getRevenueCatApiKey,
  getRevenueCatProEntitlementId,
  type MobilePlatform,
} from './env';
import { reconcileMobileRevenueCatSubscription } from './mobileApi';

type RevenueCatPackage =
  Awaited<ReturnType<typeof Purchases.getOfferings>>['all'][string]['availablePackages'][number];
type RevenueCatCustomerInfo = Awaited<ReturnType<typeof Purchases.getCustomerInfo>>;

const PRO_ENTITLEMENTS = {
  calendar_sync: true,
  full_history: true,
  full_recommendations: true,
  unlimited_bookmarks: true,
} as const;

const SUPPORTED_PLATFORMS = new Set<MobilePlatform>(['android', 'ios']);
const CURRENT_PLATFORM = Platform.OS as MobilePlatform;
const PRO_ENTITLEMENT_ID = getRevenueCatProEntitlementId();

const SUBSCRIPTION_MANAGEMENT_URLS: Partial<Record<MobilePlatform, string>> = {
  android: 'https://play.google.com/store/account/subscriptions',
  ios: 'https://apps.apple.com/account/subscriptions',
};
const CUSTOMER_CENTER_PRESENT_TIMEOUT_MS = 6_000;

let configured = false;
let currentUserId: string | null = null;

function getPlatformApiKey(platform = CURRENT_PLATFORM): string | null {
  if (!SUPPORTED_PLATFORMS.has(platform)) {
    return null;
  }

  return getRevenueCatApiKey(platform);
}

function planTypeFromProduct(productId: string): 'annual' | 'monthly' {
  const normalizedId = productId.toLowerCase();
  return normalizedId.includes('year') || normalizedId.includes('annual')
    ? 'annual'
    : 'monthly';
}

function statusFromEntitlementPeriod(periodType: string): SubscriptionStatus {
  return periodType === 'TRIAL' ? 'trialing' : 'active';
}

function getErrorSummary(error: unknown) {
  if (!error || typeof error !== 'object') {
    return { message: String(error) };
  }

  const candidate = error as {
    code?: unknown;
    message?: unknown;
    name?: unknown;
  };

  return {
    code: typeof candidate.code === 'string' ? candidate.code : undefined,
    message:
      typeof candidate.message === 'string'
        ? candidate.message
        : String(error),
    name: typeof candidate.name === 'string' ? candidate.name : undefined,
  };
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}

async function openPlatformSubscriptionManagement() {
  const url = SUBSCRIPTION_MANAGEMENT_URLS[CURRENT_PLATFORM];
  if (!url) {
    throw new Error('Subscription management is not available on this platform.');
  }

  await Linking.openURL(url);
}

function toReconcilePayload(
  customerInfo: RevenueCatCustomerInfo
): RevenueCatReconcileInput | null {
  const entitlement = customerInfo.entitlements.active[PRO_ENTITLEMENT_ID];
  if (!entitlement) {
    return null;
  }

  const isTrial = entitlement.periodType === 'TRIAL';

  return {
    currentPeriodEnd: entitlement.expirationDate ?? null,
    currentPeriodStart: entitlement.latestPurchaseDate ?? null,
    customerId: customerInfo.originalAppUserId,
    entitlementId: entitlement.identifier,
    entitlements: { ...PRO_ENTITLEMENTS },
    pastDueAt: entitlement.billingIssueDetectedAt ?? null,
    planType: planTypeFromProduct(entitlement.productIdentifier),
    productId: entitlement.productIdentifier,
    status: statusFromEntitlementPeriod(entitlement.periodType),
    tier: 'pro',
    trialEndsAt: isTrial ? entitlement.expirationDate : null,
    trialStartedAt: isTrial ? entitlement.originalPurchaseDate : null,
  };
}

async function ensureRevenueCatConfigured(
  userId: string | null = currentUserId
) {
  const apiKey = getPlatformApiKey();
  if (!apiKey) {
    throw new Error('RevenueCat is not configured for this build.');
  }

  if (!configured) {
    await Purchases.setLogLevel(LOG_LEVEL.WARN);
    Purchases.configure({
      apiKey,
      appUserID: userId ?? undefined,
    });
    configured = true;
    currentUserId = userId;
    return;
  }

  if (currentUserId === userId) {
    return;
  }

  if (userId) {
    await Purchases.logIn(userId);
  } else if (currentUserId) {
    await Purchases.logOut();
  }

  currentUserId = userId;
}

export async function syncRevenueCatIdentity(userId: string | null) {
  const apiKey = getPlatformApiKey();
  if (!apiKey) {
    return;
  }

  await ensureRevenueCatConfigured(userId);
}

export async function getRevenueCatCustomerInfo() {
  await ensureRevenueCatConfigured(currentUserId);
  return Purchases.getCustomerInfo();
}

export async function getKureCalOfferingPackages(): Promise<RevenueCatPackage[]> {
  await ensureRevenueCatConfigured(currentUserId);

  const offerings = await Purchases.getOfferings();
  const currentOffering =
    offerings.current ?? offerings.all.default ?? Object.values(offerings.all)[0] ?? null;

  if (!currentOffering) {
    throw new Error('No RevenueCat offering is configured for this app.');
  }

  const prioritized: RevenueCatPackage[] = [];
  if (currentOffering.monthly) {
    prioritized.push(currentOffering.monthly);
  }
  if (currentOffering.annual) {
    prioritized.push(currentOffering.annual);
  }

  const prioritizedIds = new Set(prioritized.map((pkg) => pkg.identifier));
  const remaining = currentOffering.availablePackages.filter(
    (pkg) => !prioritizedIds.has(pkg.identifier)
  );

  const packages = [...prioritized, ...remaining];
  if (packages.length === 0) {
    throw new Error('RevenueCat offering has no purchasable packages.');
  }

  return packages;
}

export function hasActiveKureCalProEntitlement(
  customerInfo: RevenueCatCustomerInfo
): boolean {
  return typeof customerInfo.entitlements.active[PRO_ENTITLEMENT_ID] !== 'undefined';
}

export async function purchaseRevenueCatPackage(pkg: RevenueCatPackage) {
  await ensureRevenueCatConfigured(currentUserId);
  const purchaseResult = await Purchases.purchasePackage(pkg);
  await reconcileRevenueCatCustomerInfo(purchaseResult.customerInfo);
  return purchaseResult;
}

export function isRevenueCatPurchaseCancelled(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { userCancelled?: boolean; code?: string };
  return (
    candidate.userCancelled === true ||
    candidate.code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
  );
}

export async function reconcileRevenueCatCustomerInfo(
  customerInfo: RevenueCatCustomerInfo
) {
  const payload = toReconcilePayload(customerInfo);
  if (!payload) {
    return null;
  }

  return reconcileMobileRevenueCatSubscription(payload);
}

export async function restoreRevenueCatPurchases() {
  await ensureRevenueCatConfigured(currentUserId);
  const customerInfo = await Purchases.restorePurchases();
  if (!hasActiveKureCalProEntitlement(customerInfo)) {
    throw new Error('No active KureCal Pro purchase was found to restore.');
  }

  await reconcileRevenueCatCustomerInfo(customerInfo);
  return customerInfo;
}

export async function presentKureCalCustomerCenter() {
  await ensureRevenueCatConfigured(currentUserId);

  try {
    await withTimeout(
      RevenueCatUI.presentCustomerCenter(),
      CUSTOMER_CENTER_PRESENT_TIMEOUT_MS,
      'RevenueCat Customer Center did not open in time.'
    );
    const customerInfo = await Purchases.getCustomerInfo();
    await reconcileRevenueCatCustomerInfo(customerInfo);
  } catch (error) {
    const customerCenterError = getErrorSummary(error);
    console.warn(
      '[revenuecat] Unable to present Customer Center. Opening platform subscription management fallback.',
      {
        error: customerCenterError,
        platform: Platform.OS,
      }
    );

    try {
      await openPlatformSubscriptionManagement();
    } catch (fallbackError) {
      const fallbackSummary = getErrorSummary(fallbackError);
      console.warn(
        '[revenuecat] Unable to open platform subscription management fallback.',
        {
          error: fallbackSummary,
          platform: Platform.OS,
        }
      );

      throw new Error(
        `Unable to open subscription management. Customer Center failed: ${customerCenterError.message}. Fallback failed: ${fallbackSummary.message}.`
      );
    }
  }
}

export type { RevenueCatPackage };
