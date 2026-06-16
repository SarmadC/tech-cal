import { useEffect, useMemo, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import type { NormalizedSubscription } from '@kurecal/domain';

import { ScreenStateView } from '../src/components/ScreenStateView';
import { useSubscription } from '../src/context/SubscriptionContext';
import { getMobileApiBaseUrl } from '../src/lib/env';
import {
  getKureCalOfferingPackages,
  isRevenueCatPurchaseCancelled,
  presentKureCalCustomerCenter,
  purchaseRevenueCatPackage,
  restoreRevenueCatPurchases,
  type RevenueCatPackage,
} from '../src/lib/revenuecat';
import { useScalePress } from '../src/hooks/useAnimation';
import { useAppTheme } from '../src/providers/ThemeProvider';

const FEATURE_ITEMS = [
  {
    description: 'Save beyond the free bookmark limit.',
    title: 'More saved events',
  },
  {
    description: 'Sync saved and attending events with Google Calendar.',
    title: 'Google Calendar sync',
  },
  {
    description: 'Use your profile to rank events around your goals.',
    title: 'Personalized recommendations',
  },
] as const;


function formatCurrency(value: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currencyCode} ${value.toFixed(2)}`;
  }
}

function getProductCurrencyCode(pkg: RevenueCatPackage): string | null {
  const currencyCode = pkg.product.currencyCode?.trim().toUpperCase();
  return currencyCode || null;
}

function hasUsablePrice(pkg: RevenueCatPackage): boolean {
  return Number.isFinite(pkg.product.price) && pkg.product.price > 0;
}

function formatPeriodLabel(unit: string, units: number): string {
  if (unit === 'DAY' && units % 7 === 0) {
    const weeks = Math.max(1, Math.floor(units / 7));
    return `${weeks} week${weeks > 1 ? 's' : ''}`;
  }

  const lower = unit.toLowerCase();
  return `${units} ${lower}${units > 1 ? 's' : ''}`;
}

function getTrialLabel(pkg: RevenueCatPackage): string | null {
  const intro = pkg.product.introPrice;
  if (!intro || intro.price > 0) {
    return null;
  }

  const cycles = Math.max(1, intro.cycles ?? 1);
  const units = Math.max(1, intro.periodNumberOfUnits ?? 1) * cycles;
  return `Free ${formatPeriodLabel(intro.periodUnit, units)} trial`;
}

function getPackageTitle(pkg: RevenueCatPackage): string {
  if (
    pkg.packageType === 'ANNUAL' ||
    pkg.identifier.toLowerCase().includes('annual') ||
    pkg.identifier.toLowerCase().includes('year')
  ) {
    return 'Yearly';
  }

  return 'Monthly';
}

function getAnnualSavingsLabel(packages: RevenueCatPackage[]): string | null {
  const monthly =
    packages.find((pkg) => pkg.packageType === 'MONTHLY') ??
    packages.find((pkg) => pkg.identifier.toLowerCase().includes('month'));
  const annual =
    packages.find((pkg) => pkg.packageType === 'ANNUAL') ??
    packages.find(
      (pkg) =>
        pkg.identifier.toLowerCase().includes('year') ||
        pkg.identifier.toLowerCase().includes('annual')
    );

  if (!monthly || !annual || !hasUsablePrice(monthly) || !hasUsablePrice(annual)) {
    return null;
  }

  const monthlyCurrencyCode = getProductCurrencyCode(monthly);
  const annualCurrencyCode = getProductCurrencyCode(annual);
  if (
    !monthlyCurrencyCode ||
    !annualCurrencyCode ||
    monthlyCurrencyCode !== annualCurrencyCode
  ) {
    return null;
  }

  const savings = monthly.product.price * 12 - annual.product.price;
  if (savings <= 0) {
    return null;
  }

  return `Save ${formatCurrency(savings, annualCurrencyCode)}`;
}

function getSubscriptionHeadline(subscription: NormalizedSubscription | null): string {
  if (!subscription) {
    return 'Checking your access';
  }

  const tier = subscription.tier === 'free' ? 'Free' : 'KureCal Pro';
  const status =
    subscription.status === 'trialing'
      ? 'Trialing'
      : subscription.status.replace(/_/g, ' ');

  return `${tier} · ${status}`;
}

function getPackageBillingLabel(pkg: RevenueCatPackage): string {
  return getPackageTitle(pkg) === 'Yearly' ? 'Billed annually' : 'Billed monthly';
}

export default function PaywallScreen() {
  const { tokens } = useAppTheme();
  const {
    hasPaidAccess: isPaidAccessActive,
    refreshSubscription,
    subscription,
    subscriptionLoadFailed,
    subscriptionLoading,
  } = useSubscription();

  const [packagesLoading, setPackagesLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [packages, setPackages] = useState<RevenueCatPackage[]>([]);
  const [selectedPackageIdentifier, setSelectedPackageIdentifier] = useState<
    string | null
  >(null);
  const [workingAction, setWorkingAction] = useState<
    'manage' | 'purchase' | 'restore' | null
  >(null);

  const {
    scale: primaryScale,
    onPressIn: onPrimaryPressIn,
    onPressOut: onPrimaryPressOut,
  } = useScalePress();

  async function loadPackages() {
    setPackagesLoading(true);
    try {
      const result = await getKureCalOfferingPackages();
      setPackages(result);
      setPlanError(null);
      setSelectedPackageIdentifier((current) => {
        if (current && result.some((pkg) => pkg.identifier === current)) {
          return current;
        }
        return (
          result.find((pkg) => pkg.packageType === 'MONTHLY')?.identifier ??
          result[0]?.identifier ??
          null
        );
      });
    } catch (error) {
      setPackages([]);
      setPlanError(
        error instanceof Error
          ? error.message
          : 'Unable to load subscription plans right now.'
      );
    } finally {
      setPackagesLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.allSettled([refreshSubscription(), loadPackages()]);
    setRefreshing(false);
  }

  useEffect(() => {
    void loadPackages();
  }, []);

  const selectedPackage = useMemo(
    () =>
      packages.find((pkg) => pkg.identifier === selectedPackageIdentifier) ??
      packages[0] ??
      null,
    [packages, selectedPackageIdentifier]
  );

  const annualSavingsLabel = useMemo(
    () => getAnnualSavingsLabel(packages),
    [packages]
  );
  const isAnyActionWorking = workingAction !== null;

  function openLegal(path: string) {
    void Linking.openURL(`${getMobileApiBaseUrl()}${path}`).catch((error) => {
      Alert.alert(
        'Unable to open link',
        error instanceof Error ? error.message : 'Unknown error'
      );
    });
  }

  async function handlePurchase() {
    if (!selectedPackage || isAnyActionWorking) {
      return;
    }

    setWorkingAction('purchase');
    try {
      await purchaseRevenueCatPackage(selectedPackage);
      await refreshSubscription();
      Alert.alert('Subscription active', 'KureCal Pro is now active.');
      router.back();
    } catch (error) {
      if (!isRevenueCatPurchaseCancelled(error)) {
        Alert.alert(
          'Purchase failed',
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    } finally {
      setWorkingAction(null);
    }
  }

  async function handleRestore() {
    if (isAnyActionWorking) {
      return;
    }

    setWorkingAction('restore');
    try {
      await restoreRevenueCatPurchases();
      await refreshSubscription();
      Alert.alert('Restore complete', 'Your purchases were restored.');
    } catch (error) {
      Alert.alert(
        'Restore failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
    } finally {
      setWorkingAction(null);
    }
  }

  async function handleManage() {
    if (isAnyActionWorking || !isPaidAccessActive) {
      return;
    }

    setWorkingAction('manage');
    try {
      await presentKureCalCustomerCenter();
      await refreshSubscription();
    } catch (error) {
      Alert.alert(
        'Unable to open subscription center',
        error instanceof Error ? error.message : 'Unknown error'
      );
    } finally {
      setWorkingAction(null);
    }
  }

  const t = tokens.colors;
  const sans = tokens.typography.sans;
  const r = tokens.radius;

  const initialLoading = (subscriptionLoading && !subscription) || packagesLoading;

  if (initialLoading) {
    return (
      <LinearGradient colors={tokens.gradients.page} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.stateWrap}>
            <ScreenStateView
              mode="loading"
              title="Loading subscription"
              description="Checking your KureCal Pro access and live plan catalog."
            />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (subscriptionLoadFailed && !subscription) {
    return (
      <LinearGradient colors={tokens.gradients.page} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.stateWrap}>
            <ScreenStateView
              mode="error"
              title="Paywall unavailable"
              description="Unable to load your subscription status."
              onRetry={() => {
                void refreshSubscription();
              }}
            />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={tokens.gradients.page} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.modalHeader}>
          <Pressable
            accessibilityLabel="Close"
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => router.back()}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <SymbolView
              name="xmark"
              size={18}
              tintColor={t.textTertiary}
              type="monochrome"
            />
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void handleRefresh();
              }}
              tintColor={t.accent}
            />
          }
        >
          <View style={styles.hero}>
            <View style={styles.heroHeader}>
              <Text style={[styles.eyebrow, { color: t.textTertiary, fontFamily: sans }]}>
                Subscription
              </Text>
              <View
                accessibilityLabel={`Current access: ${getSubscriptionHeadline(subscription)}`}
                style={[
                  styles.statusChip,
                  {
                    backgroundColor: t.accentSoft,
                    borderColor: t.borderStrong,
                    borderRadius: r.sm,
                  },
                ]}
              >
                <Text style={[styles.statusChipLabel, { color: t.textSecondary, fontFamily: sans }]}>
                  {getSubscriptionHeadline(subscription)}
                </Text>
              </View>
            </View>
            <Text style={[styles.title, { color: t.textPrimary, fontFamily: sans }]}>
              KureCal Pro
            </Text>
          </View>

          <View style={[styles.section, { borderTopColor: t.border }]}>
            <View style={styles.featureList}>
              {FEATURE_ITEMS.map((item) => (
                <View key={item.title} style={styles.featureRow}>
                  <View style={[styles.featureBar, { backgroundColor: t.accent }]} />
                  <View style={styles.featureCopy}>
                    <Text style={[styles.featureTitle, { color: t.textPrimary, fontFamily: sans }]}>
                      {item.title}
                    </Text>
                    <Text style={[styles.featureText, { color: t.textSecondary, fontFamily: sans }]}>
                      {item.description}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.section, { borderTopColor: t.border }]}>
            <Text style={[styles.cardTitle, { color: t.textPrimary, fontFamily: sans }]}>
              Plan
            </Text>
            {annualSavingsLabel ? (
              <Text style={[styles.cardBody, { color: t.textSecondary, fontFamily: sans }]}>
                {annualSavingsLabel} with yearly billing
              </Text>
            ) : null}

            {packages.length ? (
              <View style={styles.planStack}>
                {packages.map((pkg) => {
                  const selected = selectedPackage?.identifier === pkg.identifier;
                  const trialLabel = getTrialLabel(pkg);

                  return (
                    <Pressable
                      accessibilityHint="Selects this subscription plan"
                      accessibilityLabel={`${getPackageTitle(pkg)} plan, ${pkg.product.priceString}, ${
                        trialLabel ?? getPackageBillingLabel(pkg).toLowerCase()
                      }`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      key={pkg.identifier}
                      onPress={() => setSelectedPackageIdentifier(pkg.identifier)}
                      style={[
                        styles.planCard,
                        {
                          backgroundColor: selected ? t.surfaceStrong : t.surface,
                          borderColor: selected ? t.accent : t.border,
                          borderRadius: r.md,
                        },
                      ]}
                    >
                      <View style={styles.planHeader}>
                        <Text style={[styles.planTitle, { color: t.textPrimary, fontFamily: sans }]}>
                          {getPackageTitle(pkg)}
                        </Text>
                        {selected ? (
                          <View
                            style={[
                              styles.selectedBadge,
                              { backgroundColor: t.pillActive, borderRadius: r.sm },
                            ]}
                          >
                            <Text style={[styles.selectedBadgeLabel, { color: t.pillActiveText, fontFamily: sans }]}>
                              Selected
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={[styles.planPrice, { color: t.textPrimary, fontFamily: sans }]}>
                        {pkg.product.priceString}
                      </Text>
                      <Text style={[styles.planMeta, { color: t.textTertiary, fontFamily: sans }]}>
                        {trialLabel ?? getPackageBillingLabel(pkg)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <ScreenStateView
                mode="empty"
                title="Plans unavailable"
                description={
                  planError ??
                  'RevenueCat offerings are not available for this build yet.'
                }
              />
            )}
          </View>

          <View style={styles.actionRow}>
            <Pressable
              accessibilityLabel={isPaidAccessActive ? 'Manage subscription' : 'Subscribe now'}
              accessibilityRole="button"
              accessibilityState={{
                disabled: isPaidAccessActive
                  ? isAnyActionWorking
                  : !selectedPackage || isAnyActionWorking,
              }}
              disabled={
                isPaidAccessActive
                  ? isAnyActionWorking
                  : !selectedPackage || isAnyActionWorking
              }
              onPressIn={onPrimaryPressIn}
              onPressOut={onPrimaryPressOut}
              onPress={() => {
                void (isPaidAccessActive ? handleManage() : handlePurchase());
              }}
            >
              <Animated.View
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: t.pillActive,
                    borderRadius: r.md,
                    opacity:
                      isPaidAccessActive
                        ? isAnyActionWorking
                          ? 0.5
                          : 1
                        : !selectedPackage || isAnyActionWorking
                          ? 0.5
                          : 1,
                    transform: [{ scale: primaryScale }],
                  },
                ]}
              >
                <Text style={[styles.primaryButtonLabel, { color: t.pillActiveText, fontFamily: sans }]}>
                  {workingAction === 'purchase'
                    ? 'Subscribing...'
                    : workingAction === 'manage'
                      ? 'Opening...'
                      : isPaidAccessActive
                        ? 'Manage subscription'
                        : 'Subscribe now'}
                </Text>
              </Animated.View>
            </Pressable>

            <Pressable
              accessibilityLabel="Restore purchases"
              accessibilityRole="button"
              accessibilityState={{ disabled: isAnyActionWorking }}
              disabled={isAnyActionWorking}
              onPress={() => {
                void handleRestore();
              }}
              style={({ pressed }) => [
                styles.secondaryButton,
                {
                  borderColor: t.border,
                  borderRadius: r.md,
                  opacity: isAnyActionWorking ? 0.5 : pressed ? 0.75 : 1,
                },
              ]}
            >
              <Text style={[styles.secondaryButtonLabel, { color: t.textSecondary, fontFamily: sans }]}>
                {workingAction === 'restore' ? 'Restoring...' : 'Restore purchases'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.legalRow}>
            <Pressable
              accessibilityLabel="Open terms"
              accessibilityRole="link"
              onPress={() => openLegal('/legal/terms')}
            >
              <Text style={[styles.legalLink, { color: t.textTertiary, fontFamily: sans }]}>
                Terms
              </Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Open privacy policy"
              accessibilityRole="link"
              onPress={() => openLegal('/legal/privacy')}
            >
              <Text style={[styles.legalLink, { color: t.textTertiary, fontFamily: sans }]}>
                Privacy
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    gap: 8,
  },
  section: {
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
    paddingVertical: 16,
  },
  cardBody: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
    letterSpacing: -0.18,
  },
  content: {
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0,
  },
  featureBar: {
    borderRadius: 1,
    height: 14,
    width: 2,
  },
  featureCopy: {
    flex: 1,
    gap: 2,
  },
  featureList: {
    gap: 8,
  },
  featureRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  featureText: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  gradient: {
    flex: 1,
  },
  hero: {
    gap: 8,
    paddingBottom: 4,
  },
  heroHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  legalLink: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  legalRow: {
    flexDirection: 'row',
    gap: 20,
    justifyContent: 'center',
    paddingTop: 4,
    paddingBottom: 8,
  },
  planCard: {
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  planHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  planMeta: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  planStack: {
    gap: 8,
  },
  planTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
    paddingHorizontal: 16,
  },
  primaryButtonLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  safeArea: {
    flex: 1,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  secondaryButton: {
    alignItems: 'center',
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 28,
    paddingHorizontal: 16,
  },
  secondaryButtonLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  selectedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  selectedBadgeLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  stateWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  statusChip: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusChipLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0,
  },

  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.24,
    lineHeight: 30,
  },
});
