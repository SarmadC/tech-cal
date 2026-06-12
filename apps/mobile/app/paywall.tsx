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

import type { NormalizedSubscription } from '@kurecal/domain';

import { ScreenStateView } from '../src/components/ScreenStateView';
import { useAuth } from '../src/context/AuthProvider';
import { getMobileApiBaseUrl } from '../src/lib/env';
import { loadMobileSubscriptionStatus } from '../src/lib/mobileApi';
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
  'Full recommendation engine',
  'Calendar sync and native planning',
  'Unlimited saved events',
  'Advanced opportunity insight surfaces',
] as const;

function hasPaidAccess(subscription: NormalizedSubscription | null): boolean {
  if (!subscription || subscription.tier === 'free') {
    return false;
  }

  if (
    subscription.status === 'active' ||
    subscription.status === 'trialing' ||
    subscription.status === 'past_due'
  ) {
    return true;
  }

  if (subscription.status === 'canceled' && subscription.currentPeriodEnd) {
    return new Date(subscription.currentPeriodEnd).getTime() > Date.now();
  }

  return false;
}

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

  if (!monthly || !annual) {
    return null;
  }

  const savings = monthly.product.price * 12 - annual.product.price;
  if (savings <= 0) {
    return null;
  }

  return `Save ${formatCurrency(savings, annual.product.currencyCode)}`;
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

export default function PaywallScreen() {
  const { session } = useAuth();
  const { tokens } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [packages, setPackages] = useState<RevenueCatPackage[]>([]);
  const [selectedPackageIdentifier, setSelectedPackageIdentifier] = useState<
    string | null
  >(null);
  const [subscription, setSubscription] = useState<NormalizedSubscription | null>(
    null
  );
  const [workingAction, setWorkingAction] = useState<
    'manage' | 'purchase' | 'restore' | null
  >(null);

  const { scale: subscribeScale, onPressIn: onSubscribePressIn, onPressOut: onSubscribePressOut } = useScalePress();

  async function loadScreen(mode: 'initial' | 'refresh' = 'initial') {
    if (mode === 'refresh') {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [subscriptionResult, packagesResult] = await Promise.allSettled([
        loadMobileSubscriptionStatus(),
        getKureCalOfferingPackages(),
      ]);

      if (subscriptionResult.status === 'rejected') {
        throw subscriptionResult.reason;
      }

      setSubscription(subscriptionResult.value);
      setScreenError(null);

      if (packagesResult.status === 'fulfilled') {
        setPackages(packagesResult.value);
        setPlanError(null);
        setSelectedPackageIdentifier((current) => {
          if (current) {
            return current;
          }

          return (
            packagesResult.value.find((pkg) => pkg.packageType === 'MONTHLY')
              ?.identifier ??
            packagesResult.value[0]?.identifier ??
            null
          );
        });
      } else {
        setPackages([]);
        setPlanError(
          packagesResult.reason instanceof Error
            ? packagesResult.reason.message
            : 'Unable to load subscription plans right now.'
        );
      }
    } catch (error) {
      setScreenError(
        error instanceof Error ? error.message : 'Unable to load the paywall'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadScreen();
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

  function openLegal(path: string) {
    void Linking.openURL(`${getMobileApiBaseUrl()}${path}`).catch((error) => {
      Alert.alert(
        'Unable to open link',
        error instanceof Error ? error.message : 'Unknown error'
      );
    });
  }

  async function handlePurchase() {
    if (!selectedPackage) {
      return;
    }

    setWorkingAction('purchase');
    try {
      await purchaseRevenueCatPackage(selectedPackage);
      await loadScreen('refresh');
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
    setWorkingAction('restore');
    try {
      await restoreRevenueCatPurchases();
      await loadScreen('refresh');
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
    setWorkingAction('manage');
    try {
      await presentKureCalCustomerCenter();
      await loadScreen('refresh');
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

  if (loading && !subscription) {
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

  if (screenError && !subscription) {
    return (
      <LinearGradient colors={tokens.gradients.page} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.stateWrap}>
            <ScreenStateView
              mode="error"
              title="Paywall unavailable"
              description={screenError}
              onRetry={() => {
                void loadScreen();
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
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void loadScreen('refresh');
              }}
              tintColor={t.accent}
            />
          }
        >
          {/* Hero */}
          <View style={styles.hero}>
            <Text style={[styles.eyebrow, { color: t.textTertiary, fontFamily: sans }]}>
              Subscription
            </Text>
            <Text style={[styles.title, { color: t.textPrimary, fontFamily: sans }]}>
              KureCal Pro
            </Text>
            <Text style={[styles.subtitle, { color: t.textSecondary, fontFamily: sans }]}>
              Move from discovery to commitment with full recommendations,
              calendar sync, and unlimited saved events.
            </Text>
            <Text style={[styles.meta, { color: t.textTertiary, fontFamily: sans }]}>
              {getSubscriptionHeadline(subscription)}
            </Text>
            <Text style={[styles.sessionMeta, { color: t.textTertiary, fontFamily: sans }]}>
              {session?.user.email ?? 'unknown user'}
            </Text>
          </View>

          {/* Why upgrade */}
          <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
            <Text style={[styles.cardTitle, { color: t.textPrimary, fontFamily: sans }]}>
              Why upgrade
            </Text>
            <View style={styles.featureList}>
              {FEATURE_ITEMS.map((item) => (
                <View key={item} style={styles.featureRow}>
                  <View style={[styles.featureBar, { backgroundColor: t.accent }]} />
                  <Text style={[styles.featureText, { color: t.textSecondary, fontFamily: sans }]}>
                    {item}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Current access */}
          <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
            <Text style={[styles.cardTitle, { color: t.textPrimary, fontFamily: sans }]}>
              Current access
            </Text>
            <Text style={[styles.cardBody, { color: t.textSecondary, fontFamily: sans }]}>
              {hasPaidAccess(subscription)
                ? 'Your paid access is active on mobile. You can manage renewals or restore prior purchases at any time.'
                : 'You are on the free tier. Upgrade to unlock the full recommendation engine and native planning controls.'}
            </Text>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusChip,
                  { backgroundColor: t.accentSoft, borderColor: t.borderStrong, borderRadius: r.sm },
                ]}
              >
                <Text style={[styles.statusChipLabel, { color: t.textSecondary, fontFamily: sans }]}>
                  {subscription?.tier === 'free' ? 'Free' : 'Pro'}
                </Text>
              </View>
              <View
                style={[
                  styles.statusChip,
                  { backgroundColor: t.accentSoft, borderColor: t.borderStrong, borderRadius: r.sm },
                ]}
              >
                <Text style={[styles.statusChipLabel, { color: t.textSecondary, fontFamily: sans }]}>
                  {subscription?.status ?? 'unknown'}
                </Text>
              </View>
            </View>
          </View>

          {/* Choose your plan */}
          <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
            <Text style={[styles.cardTitle, { color: t.textPrimary, fontFamily: sans }]}>
              Choose your plan
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
                        {trialLabel ??
                          (getPackageTitle(pkg) === 'Yearly'
                            ? 'Billed annually'
                            : 'Billed monthly')}
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

          {/* Actions */}
          <View style={styles.actionRow}>
            <Pressable
              disabled={!selectedPackage || workingAction === 'purchase'}
              onPressIn={onSubscribePressIn}
              onPressOut={onSubscribePressOut}
              onPress={() => {
                void handlePurchase();
              }}
            >
              <Animated.View
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: t.pillActive,
                    borderRadius: r.md,
                    opacity: (!selectedPackage || workingAction === 'purchase') ? 0.5 : 1,
                    transform: [{ scale: subscribeScale }],
                  },
                ]}
              >
                <Text style={[styles.primaryButtonLabel, { color: t.pillActiveText, fontFamily: sans }]}>
                  {workingAction === 'purchase' ? 'Subscribing…' : 'Subscribe now'}
                </Text>
              </Animated.View>
            </Pressable>

            <Pressable
              disabled={workingAction === 'restore'}
              onPress={() => {
                void handleRestore();
              }}
              style={({ pressed }) => [
                styles.secondaryButton,
                {
                  borderColor: t.border,
                  borderRadius: r.md,
                  opacity: workingAction === 'restore' ? 0.5 : pressed ? 0.75 : 1,
                },
              ]}
            >
              <Text style={[styles.secondaryButtonLabel, { color: t.textSecondary, fontFamily: sans }]}>
                {workingAction === 'restore' ? 'Restoring…' : 'Restore purchases'}
              </Text>
            </Pressable>

            <Pressable
              disabled={workingAction === 'manage'}
              onPress={() => {
                void handleManage();
              }}
              style={({ pressed }) => [
                styles.secondaryButton,
                {
                  borderColor: t.border,
                  borderRadius: r.md,
                  opacity: workingAction === 'manage' ? 0.5 : pressed ? 0.75 : 1,
                },
              ]}
            >
              <Text style={[styles.secondaryButtonLabel, { color: t.textSecondary, fontFamily: sans }]}>
                {workingAction === 'manage'
                  ? 'Opening…'
                  : hasPaidAccess(subscription)
                    ? 'Manage subscription'
                    : 'Open subscription center'}
              </Text>
            </Pressable>
          </View>

          {/* Legal */}
          <View style={styles.legalRow}>
            <Pressable onPress={() => openLegal('/legal/terms')}>
              <Text style={[styles.legalLink, { color: t.textTertiary, fontFamily: sans }]}>
                Terms
              </Text>
            </Pressable>
            <Pressable onPress={() => openLegal('/legal/privacy')}>
              <Text style={[styles.legalLink, { color: t.textTertiary, fontFamily: sans }]}>
                Privacy
              </Text>
            </Pressable>
            <Pressable onPress={() => router.back()}>
              <Text style={[styles.legalLink, { color: t.textTertiary, fontFamily: sans }]}>
                Close
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
  card: {
    borderWidth: 1,
    borderRadius: 6,
    gap: 12,
    padding: 16,
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
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  featureBar: {
    borderRadius: 1,
    height: 14,
    width: 2,
  },
  featureList: {
    gap: 10,
  },
  featureRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  featureText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  gradient: {
    flex: 1,
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
  meta: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    marginTop: 2,
  },
  planCard: {
    borderWidth: 1,
    gap: 6,
    padding: 14,
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
    minHeight: 40,
    paddingHorizontal: 16,
  },
  primaryButtonLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  safeArea: {
    flex: 1,
  },
  secondaryButton: {
    alignItems: 'center',
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
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
  sessionMeta: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
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
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
    marginTop: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.24,
    lineHeight: 30,
  },
});
