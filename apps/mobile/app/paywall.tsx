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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import type { NormalizedSubscription } from '@kurecal/domain';

import { ScreenStateView } from '../src/components/ScreenStateView';
import { useSubscription } from '../src/context/SubscriptionContext';
import { getMobileApiBaseUrl } from '../src/lib/env';
import {
  getKureCalOfferingPackages,
  isRevenueCatPurchaseCancelled,
  openKureCalSubscriptionManagement,
  purchaseRevenueCatPackage,
  restoreRevenueCatPurchases,
  type RevenueCatPackage,
} from '../src/lib/revenuecat';
import { useScalePress } from '../src/hooks/useAnimation';
import { useAppTheme } from '../src/providers/ThemeProvider';
import { haptics } from '../src/lib/haptics';

const FEATURE_ITEMS = [
  { icon: 'bookmark.fill', title: 'Save more events' },
  { icon: 'calendar.badge.checkmark', title: 'One-tap Google Calendar sync' },
  { icon: 'sparkles', title: 'Personalized event recommendations' },
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

function getAnnualSavingsPercentLabel(packages: RevenueCatPackage[]): string | null {
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

  const monthlyCost = monthly.product.price * 12;
  const savings = monthlyCost - annual.product.price;
  if (monthlyCost <= 0 || savings <= 0) {
    return null;
  }

  return `Save ${Math.round((savings / monthlyCost) * 100)}%`;
}

function getMonthlyEquivalent(pkg: RevenueCatPackage): string | null {
  if (!hasUsablePrice(pkg)) {
    return null;
  }

  const currencyCode = getProductCurrencyCode(pkg);
  if (!currencyCode) {
    return null;
  }

  return formatCurrency(pkg.product.price / 12, currencyCode);
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

function getPrimaryCtaLabel(
  selectedPackage: RevenueCatPackage | null,
  isPaidAccessActive: boolean,
  workingAction: 'manage' | 'purchase' | 'restore' | null
): string {
  if (workingAction === 'purchase') {
    return 'Subscribing...';
  }
  if (workingAction === 'manage') {
    return 'Opening...';
  }
  if (isPaidAccessActive) {
    return 'Manage subscription';
  }
  if (!selectedPackage) {
    return 'Subscribe now';
  }

  const unit = getPackageTitle(selectedPackage) === 'Yearly' ? 'year' : 'month';
  return `Start Pro — ${selectedPackage.product.priceString}/${unit}`;
}

export default function PaywallScreen() {
  const { tokens } = useAppTheme();
  const insets = useSafeAreaInsets();
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
          result.find((pkg) => getPackageTitle(pkg) === 'Yearly')?.identifier ??
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
    () => getAnnualSavingsPercentLabel(packages),
    [packages]
  );
  const orderedPackages = useMemo(
    () =>
      [...packages].sort((a, b) => {
        const rank = (pkg: RevenueCatPackage) => (getPackageTitle(pkg) === 'Yearly' ? 0 : 1);
        return rank(a) - rank(b);
      }),
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
      await openKureCalSubscriptionManagement();
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
        <View
          style={[
            styles.safeArea,
            {
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
            },
          ]}
        >
          <View style={styles.stateWrap}>
            <ScreenStateView
              mode="loading"
              title="Loading subscription"
              description="Checking your KureCal Pro access and live plan catalog."
            />
          </View>
        </View>
      </LinearGradient>
    );
  }

  if (subscriptionLoadFailed && !subscription) {
    return (
      <LinearGradient colors={tokens.gradients.page} style={styles.gradient}>
        <View
          style={[
            styles.safeArea,
            {
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
            },
          ]}
        >
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
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={tokens.gradients.page} style={styles.gradient}>
      <View
        style={[
          styles.safeArea,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <View style={styles.dragHandleRow}>
          <View style={[styles.dragHandle, { backgroundColor: t.borderStrong }]} />
        </View>
        <View style={styles.modalHeader}>
          <Pressable
            accessibilityLabel="Close"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => router.back()}
            style={({ pressed }) => [styles.closeButton, { opacity: pressed ? 0.5 : 1 }]}
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
            <Text style={[styles.eyebrow, { color: t.textTertiary, fontFamily: sans }]}>
              KureCal Pro
            </Text>
            <Text style={[styles.headline, { color: t.textPrimary, fontFamily: sans }]}>
              Never miss the events worth attending.
            </Text>
            <Text style={[styles.subhead, { color: t.textSecondary, fontFamily: sans }]}>
              Save the conferences you care about, sync them to Google Calendar, and
              discover more events tailored to your interests.
            </Text>
            <Text style={[styles.statusLine, { color: t.textTertiary, fontFamily: sans }]}>
              {getSubscriptionHeadline(subscription)}
            </Text>
          </View>

          <View style={[styles.section, { borderTopColor: t.border }]}>
            <View style={styles.featureList}>
              {FEATURE_ITEMS.map((item) => (
                <View key={item.title} style={styles.featureRow}>
                  <View style={styles.featureIconWrap}>
                    <SymbolView
                      name={item.icon}
                      size={16}
                      tintColor={t.accent}
                      type="monochrome"
                    />
                  </View>
                  <Text style={[styles.featureTitle, { color: t.textPrimary, fontFamily: sans }]}>
                    {item.title}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.section, { borderTopColor: t.border }]}>
            <Text style={[styles.cardTitle, { color: t.textPrimary, fontFamily: sans }]}>
              Choose your plan
            </Text>

            {orderedPackages.length ? (
              <View style={styles.planStack}>
                {orderedPackages.map((pkg) => {
                  const selected = selectedPackage?.identifier === pkg.identifier;
                  const trialLabel = getTrialLabel(pkg);
                  const isYearly = getPackageTitle(pkg) === 'Yearly';
                  const monthlyEquivalent = isYearly ? getMonthlyEquivalent(pkg) : null;

                  return (
                    <Pressable
                      accessibilityHint="Selects this subscription plan"
                      accessibilityLabel={`${getPackageTitle(pkg)} plan, ${pkg.product.priceString}, ${
                        trialLabel ?? getPackageBillingLabel(pkg).toLowerCase()
                      }`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      key={pkg.identifier}
                      onPress={() => {
                        haptics.selection();
                        setSelectedPackageIdentifier(pkg.identifier);
                      }}
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
                        <View style={styles.planTitleRow}>
                          <Text style={[styles.planTitle, { color: t.textPrimary, fontFamily: sans }]}>
                            {getPackageTitle(pkg)}
                          </Text>
                          {isYearly ? (
                            <View
                              style={[
                                styles.bestValueBadge,
                                { backgroundColor: t.accentSoft, borderRadius: r.sm },
                              ]}
                            >
                              <Text style={[styles.bestValueBadgeLabel, { color: t.accent, fontFamily: sans }]}>
                                Best value
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <View style={[styles.radioOuter, { borderColor: selected ? t.accent : t.border }]}>
                          {selected ? (
                            <View style={[styles.radioInner, { backgroundColor: t.accent }]} />
                          ) : null}
                        </View>
                      </View>
                      <Text style={[styles.planPrice, { color: t.textPrimary, fontFamily: sans }]}>
                        {pkg.product.priceString}
                        <Text style={[styles.planPriceUnit, { color: t.textTertiary, fontFamily: sans }]}>
                          {isYearly ? '/year' : '/month'}
                        </Text>
                      </Text>
                      {isYearly && monthlyEquivalent ? (
                        <View style={styles.planSubRow}>
                          <Text style={[styles.planMeta, { color: t.textTertiary, fontFamily: sans }]}>
                            {monthlyEquivalent}/month
                          </Text>
                          {annualSavingsLabel ? (
                            <Text style={[styles.planSavings, { color: t.success, fontFamily: sans }]}>
                              {annualSavingsLabel}
                            </Text>
                          ) : null}
                        </View>
                      ) : (
                        <Text style={[styles.planMeta, { color: t.textTertiary, fontFamily: sans }]}>
                          {trialLabel ?? 'Cancel anytime'}
                        </Text>
                      )}
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
              accessibilityLabel={getPrimaryCtaLabel(selectedPackage, isPaidAccessActive, null)}
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
                  {getPrimaryCtaLabel(selectedPackage, isPaidAccessActive, workingAction)}
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

            {!isPaidAccessActive ? (
              <Text style={[styles.reassurance, { color: t.textTertiary, fontFamily: sans }]}>
                Cancel anytime in the App Store.
              </Text>
            ) : null}
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
      </View>
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
  bestValueBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  bestValueBadgeLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
    letterSpacing: -0.18,
  },
  closeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
  },
  content: {
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  dragHandle: {
    borderRadius: 2,
    height: 4,
    width: 36,
  },
  dragHandleRow: {
    alignItems: 'center',
    paddingTop: 8,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0,
  },
  featureIconWrap: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  featureList: {
    gap: 12,
  },
  featureRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  featureTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  gradient: {
    flex: 1,
  },
  headline: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.24,
    lineHeight: 30,
  },
  hero: {
    gap: 6,
    paddingBottom: 4,
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
    gap: 6,
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
  planPriceUnit: {
    fontSize: 13,
    fontWeight: '500',
  },
  planSavings: {
    fontSize: 12,
    fontWeight: '600',
  },
  planStack: {
    gap: 8,
  },
  planSubRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  planTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  planTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
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
  radioInner: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  radioOuter: {
    alignItems: 'center',
    borderRadius: 9,
    borderWidth: 1.5,
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  reassurance: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    textAlign: 'center',
  },
  safeArea: {
    flex: 1,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 4,
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
  stateWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  statusLine: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  subhead: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
});
