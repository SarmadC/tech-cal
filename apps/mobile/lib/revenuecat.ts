import Purchases, { LOG_LEVEL, type CustomerInfo } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import type { PurchasesPackage } from '@revenuecat/purchases-typescript-internal';
import type { RevenueCatReconcileInput, SubscriptionStatus } from '@kurecal/domain';
import { getRevenueCatApiKey, getRevenueCatProEntitlementId } from '@/lib/env';
import { getMobileApiClient } from '@/lib/mobileApi';

const PRO_ENTITLEMENTS = {
  calendar_sync: true,
  full_history: true,
  full_recommendations: true,
  unlimited_bookmarks: true,
} as const;

const PRO_ENTITLEMENT_ID = getRevenueCatProEntitlementId();

let configured = false;
let currentUserId: string | null = null;

function planTypeFromProduct(productId: string): 'monthly' | 'annual' {
  const normalizedId = productId.toLowerCase();
  return normalizedId.includes('year') || normalizedId.includes('annual')
    ? 'annual'
    : 'monthly';
}

function statusFromEntitlementPeriod(periodType: string): SubscriptionStatus {
  return periodType === 'TRIAL' ? 'trialing' : 'active';
}

function toReconcilePayload(customerInfo: CustomerInfo): RevenueCatReconcileInput | null {
  const entitlement = customerInfo.entitlements.active[PRO_ENTITLEMENT_ID];
  if (!entitlement) {
    return null;
  }

  const isTrial = entitlement.periodType === 'TRIAL';

  return {
    customerId: customerInfo.originalAppUserId,
    entitlementId: entitlement.identifier,
    productId: entitlement.productIdentifier,
    tier: 'pro',
    status: statusFromEntitlementPeriod(entitlement.periodType),
    planType: planTypeFromProduct(entitlement.productIdentifier),
    currentPeriodStart: entitlement.latestPurchaseDate ?? null,
    currentPeriodEnd: entitlement.expirationDate ?? null,
    trialStartedAt: isTrial ? entitlement.originalPurchaseDate : null,
    trialEndsAt: isTrial ? entitlement.expirationDate : null,
    pastDueAt: entitlement.billingIssueDetectedAt ?? null,
    entitlements: { ...PRO_ENTITLEMENTS },
  };
}

export async function configureRevenueCat(userId?: string | null) {
  const apiKey = getRevenueCatApiKey();
  if (!apiKey || configured) {
    return;
  }

  await Purchases.setLogLevel(LOG_LEVEL.WARN);
  Purchases.configure({ apiKey, appUserID: userId ?? undefined });
  configured = true;
  currentUserId = userId ?? null;
}

export async function syncRevenueCatIdentity(userId: string | null) {
  const apiKey = getRevenueCatApiKey();
  if (!apiKey) {
    return;
  }

  await configureRevenueCat(userId);
  if (!configured || currentUserId === userId) {
    return;
  }

  if (userId) {
    await Purchases.logIn(userId);
  } else {
    await Purchases.logOut();
  }

  currentUserId = userId;
}

export async function getRevenueCatCustomerInfo() {
  await configureRevenueCat(currentUserId);
  return Purchases.getCustomerInfo();
}

export async function getKureCalOfferingPackages(): Promise<PurchasesPackage[]> {
  await configureRevenueCat(currentUserId);

  const offerings = await Purchases.getOfferings();
  const currentOffering =
    offerings.current ?? offerings.all.default ?? Object.values(offerings.all)[0] ?? null;

  if (!currentOffering) {
    throw new Error('No RevenueCat offering is configured for this app.');
  }

  const prioritized: PurchasesPackage[] = [];
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

export function hasActiveKureCalProEntitlement(customerInfo: CustomerInfo): boolean {
  return typeof customerInfo.entitlements.active[PRO_ENTITLEMENT_ID] !== 'undefined';
}

export async function purchaseRevenueCatPackage(pkg: PurchasesPackage) {
  await configureRevenueCat(currentUserId);
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

export async function reconcileRevenueCatCustomerInfo(customerInfo: CustomerInfo) {
  const payload = toReconcilePayload(customerInfo);
  if (!payload) {
    return;
  }

  const result = await getMobileApiClient().reconcileRevenueCat(payload);
  if (!result.success) {
    throw new Error(result.error ?? 'RevenueCat reconcile failed');
  }
}

export async function presentKureCalProPaywall(): Promise<PAYWALL_RESULT> {
  await configureRevenueCat(currentUserId);

  const result = await RevenueCatUI.presentPaywallIfNeeded({
    requiredEntitlementIdentifier: PRO_ENTITLEMENT_ID,
  });

  if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
    const customerInfo = await Purchases.getCustomerInfo();
    await reconcileRevenueCatCustomerInfo(customerInfo);
  }

  return result;
}

export async function restoreRevenueCatPurchases() {
  await configureRevenueCat(currentUserId);
  const customerInfo = await Purchases.restorePurchases();
  if (!hasActiveKureCalProEntitlement(customerInfo)) {
    throw new Error('No active Kure-Cal Pro purchase was found to restore.');
  }
  await reconcileRevenueCatCustomerInfo(customerInfo);
  return customerInfo;
}

export async function presentKureCalCustomerCenter() {
  await configureRevenueCat(currentUserId);

  await RevenueCatUI.presentCustomerCenter({
    callbacks: {
      onRestoreCompleted: ({ customerInfo }) => {
        void reconcileRevenueCatCustomerInfo(customerInfo).catch((error: unknown) => {
          console.warn('RevenueCat restore reconciliation failed', error);
        });
      },
    },
  });
}

export function registerCustomerInfoSync() {
  const listener = (customerInfo: CustomerInfo) => {
    void reconcileRevenueCatCustomerInfo(customerInfo).catch((error: unknown) => {
      console.warn('RevenueCat sync failed', error);
    });
  };

  Purchases.addCustomerInfoUpdateListener(listener);
  return () => {
    Purchases.removeCustomerInfoUpdateListener(listener);
  };
}
