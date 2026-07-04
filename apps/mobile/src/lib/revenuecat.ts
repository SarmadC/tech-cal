import { Linking, Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import RevenueCatUI from 'react-native-purchases-ui';

import type {
  RevenueCatReconcileInput,
  SubscriptionStatus,
} from '@kurecal/domain';

import {
  getRevenueCatApiKey,
  getRevenueCatProductIds,
  getRevenueCatProEntitlementId,
  type MobilePlatform,
} from './env';
import { reconcileMobileRevenueCatSubscription } from './mobileApi';

type RevenueCatPackage =
  Awaited<ReturnType<typeof Purchases.getOfferings>>['all'][string]['availablePackages'][number];
type RevenueCatCustomerInfo = Awaited<ReturnType<typeof Purchases.getCustomerInfo>>;
type RevenueCatEntitlementInfo =
  RevenueCatCustomerInfo['entitlements']['all'][string];

const PRO_ENTITLEMENTS = {
  calendar_sync: true,
  full_history: true,
  full_recommendations: true,
  unlimited_bookmarks: true,
} as const;
const FREE_ENTITLEMENTS = {
  calendar_sync: false,
  full_history: false,
  full_recommendations: false,
  unlimited_bookmarks: false,
} as const;

const SUPPORTED_PLATFORMS = new Set<MobilePlatform>(['android', 'ios']);
const CURRENT_PLATFORM = Platform.OS as MobilePlatform;
const PRO_ENTITLEMENT_ID = getRevenueCatProEntitlementId();

const SUBSCRIPTION_MANAGEMENT_URLS: Partial<Record<MobilePlatform, string>> = {
  android: 'https://play.google.com/store/account/subscriptions',
  ios: 'https://apps.apple.com/account/subscriptions',
};
const SUBSCRIPTION_MANAGEMENT_TIMEOUT_MS = 8_000;

let configured = false;
let currentUserId: string | null = null;
let revenueCatOperation: Promise<void> = Promise.resolve();

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

function inactiveStatusFromEntitlement(
  entitlement: RevenueCatEntitlementInfo
): SubscriptionStatus {
  if (entitlement.billingIssueDetectedAt) {
    return 'past_due';
  }

  if (entitlement.expirationDate) {
    const expirationTime = new Date(entitlement.expirationDate).getTime();
    if (!Number.isNaN(expirationTime) && expirationTime <= Date.now()) {
      return 'expired';
    }
  }

  return 'canceled';
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

async function openPlatformSubscriptionManagement() {
  const url = SUBSCRIPTION_MANAGEMENT_URLS[CURRENT_PLATFORM];
  if (!url) {
    throw new Error('Subscription management is not available on this platform.');
  }

  await Linking.openURL(url);
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

function toReconcilePayload(
  customerInfo: RevenueCatCustomerInfo
): RevenueCatReconcileInput | null {
  const activeEntitlement = customerInfo.entitlements.active[PRO_ENTITLEMENT_ID];
  const entitlement =
    activeEntitlement ?? customerInfo.entitlements.all[PRO_ENTITLEMENT_ID];
  if (!entitlement) {
    return null;
  }

  const isTrial = entitlement.periodType === 'TRIAL';
  const isActive = Boolean(activeEntitlement);
  const tier = isActive ? 'pro' : 'free';

  return {
    currentPeriodEnd: entitlement.expirationDate ?? null,
    currentPeriodStart: entitlement.latestPurchaseDate ?? null,
    customerId: customerInfo.originalAppUserId,
    entitlementId: entitlement.identifier,
    entitlements: isActive ? { ...PRO_ENTITLEMENTS } : { ...FREE_ENTITLEMENTS },
    pastDueAt: entitlement.billingIssueDetectedAt ?? null,
    planType: planTypeFromProduct(entitlement.productIdentifier),
    productId: entitlement.productIdentifier,
    status: isActive
      ? statusFromEntitlementPeriod(entitlement.periodType)
      : inactiveStatusFromEntitlement(entitlement),
    tier,
    trialEndsAt: isActive && isTrial ? entitlement.expirationDate : null,
    trialStartedAt: isActive && isTrial ? entitlement.originalPurchaseDate : null,
  };
}

async function enqueueRevenueCatOperation<T>(operation: () => Promise<T>): Promise<T> {
  const previousOperation = revenueCatOperation.catch(() => undefined);
  let releaseOperation!: () => void;
  revenueCatOperation = previousOperation.then(
    () =>
      new Promise<void>((resolve) => {
        releaseOperation = resolve;
      })
  );

  await previousOperation;

  try {
    return await operation();
  } finally {
    releaseOperation();
  }
}

async function configureRevenueCat(userId: string | null) {
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

async function ensureRevenueCatConfigured(userId?: string | null) {
  await configureRevenueCat(userId === undefined ? currentUserId : userId);
}

async function withRevenueCatConfigured<T>(
  operation: () => Promise<T>,
  userId?: string | null
): Promise<T> {
  return enqueueRevenueCatOperation(async () => {
    await ensureRevenueCatConfigured(userId);
    return operation();
  });
}

export async function syncRevenueCatIdentity(userId: string | null) {
  const apiKey = getPlatformApiKey();
  if (!apiKey) {
    return;
  }

  await withRevenueCatConfigured(async () => undefined, userId);
}

export async function getRevenueCatCustomerInfo() {
  return withRevenueCatConfigured(() => Purchases.getCustomerInfo());
}

export async function getKureCalOfferingPackages(): Promise<RevenueCatPackage[]> {
  return withRevenueCatConfigured(async () => {
    const offerings = await Purchases.getOfferings();
    const currentOffering =
      offerings.current ?? offerings.all.default ?? Object.values(offerings.all)[0] ?? null;

    if (!currentOffering) {
      throw new Error('No RevenueCat offering is configured for this app.');
    }

    const configuredProductIds = getRevenueCatProductIds();
    const monthlyPackage =
      currentOffering.availablePackages.find(
        (pkg) => pkg.product.identifier === configuredProductIds.monthly
      ) ?? currentOffering.monthly;
    const annualPackage =
      currentOffering.availablePackages.find(
        (pkg) => pkg.product.identifier === configuredProductIds.annual
      ) ?? currentOffering.annual;

    const prioritized: RevenueCatPackage[] = [];
    if (monthlyPackage) {
      prioritized.push(monthlyPackage);
    }
    if (annualPackage) {
      prioritized.push(annualPackage);
    }

    const prioritizedIds = new Set(prioritized.map((pkg) => pkg.identifier));
    const shouldRestrictToConfiguredProducts = Boolean(
      configuredProductIds.monthly || configuredProductIds.annual
    );
    const configuredProductIdSet = new Set(
      [configuredProductIds.monthly, configuredProductIds.annual].filter(
        (id): id is string => Boolean(id)
      )
    );
    const remaining = shouldRestrictToConfiguredProducts
      ? []
      : currentOffering.availablePackages.filter(
          (pkg) => !prioritizedIds.has(pkg.identifier)
        );

    const packages = [...prioritized, ...remaining].filter((pkg) => {
      if (!shouldRestrictToConfiguredProducts) {
        return true;
      }

      return configuredProductIdSet.has(pkg.product.identifier);
    });
    if (packages.length === 0) {
      throw new Error(
        shouldRestrictToConfiguredProducts
          ? 'RevenueCat offering does not include the configured KureCal Pro products.'
          : 'RevenueCat offering has no purchasable packages.'
      );
    }

    return packages;
  });
}

export function hasActiveKureCalProEntitlement(
  customerInfo: RevenueCatCustomerInfo
): boolean {
  return typeof customerInfo.entitlements.active[PRO_ENTITLEMENT_ID] !== 'undefined';
}

export async function purchaseRevenueCatPackage(pkg: RevenueCatPackage) {
  const purchaseResult = await withRevenueCatConfigured(() =>
    Purchases.purchasePackage(pkg)
  );
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

export async function syncKureCalSubscriptionFromRevenueCat() {
  const customerInfo = await getRevenueCatCustomerInfo();
  return reconcileRevenueCatCustomerInfo(customerInfo);
}

export async function restoreRevenueCatPurchases() {
  const customerInfo = await withRevenueCatConfigured(() =>
    Purchases.restorePurchases()
  );
  if (!hasActiveKureCalProEntitlement(customerInfo)) {
    throw new Error('No active KureCal Pro purchase was found to restore.');
  }

  await reconcileRevenueCatCustomerInfo(customerInfo);
  return customerInfo;
}

export async function presentKureCalCustomerCenter() {
  try {
    await withRevenueCatConfigured(async () => undefined);
    await RevenueCatUI.presentCustomerCenter();
    const customerInfo = await getRevenueCatCustomerInfo();
    await reconcileRevenueCatCustomerInfo(customerInfo);
    return;
  } catch (error) {
    const customerCenterError = getErrorSummary(error);
    console.warn(
      '[revenuecat] Unable to present Customer Center. Opening native subscription management fallback.',
      {
        error: customerCenterError,
        platform: Platform.OS,
      }
    );

    try {
      await openKureCalSubscriptionManagement();
      const customerInfo = await getRevenueCatCustomerInfo();
      await reconcileRevenueCatCustomerInfo(customerInfo);
      return;
    } catch (storeKitError) {
      const storeKitSummary = getErrorSummary(storeKitError);
      console.warn(
        '[revenuecat] Unable to open native subscription management fallback. Opening platform subscription management fallback.',
        {
          error: storeKitSummary,
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
          `Unable to open subscription management. Customer Center failed: ${customerCenterError.message}. StoreKit fallback failed: ${storeKitSummary.message}. Platform fallback failed: ${fallbackSummary.message}.`
        );
      }
    }
  }
}

export async function openKureCalSubscriptionManagement() {
  await withRevenueCatConfigured(async () => undefined);

  if (CURRENT_PLATFORM === 'ios') {
    await withTimeout(
      Purchases.showManageSubscriptions(),
      SUBSCRIPTION_MANAGEMENT_TIMEOUT_MS,
      'Subscription management did not open in time.'
    );
    return;
  }

  await openPlatformSubscriptionManagement();
}

export type { RevenueCatPackage };
