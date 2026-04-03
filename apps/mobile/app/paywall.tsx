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

  if (loading && !subscription) {
    return (
      <LinearGradient colors={['#071019', '#04070c', '#020304']} style={styles.gradient}>
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
      <LinearGradient colors={['#071019', '#04070c', '#020304']} style={styles.gradient}>
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
    <LinearGradient colors={['#071019', '#04070c', '#020304']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void loadScreen('refresh');
              }}
              tintColor="#7dd3fc"
            />
          }
        >
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>Subscription</Text>
            <Text style={styles.title}>KureCal Pro</Text>
            <Text style={styles.subtitle}>
              Move from discovery to commitment with full recommendations,
              calendar sync, and unlimited saved events.
            </Text>
            <Text style={styles.meta}>{getSubscriptionHeadline(subscription)}</Text>
            <Text style={styles.sessionMeta}>
              Signed in as {session?.user.email ?? 'unknown user'}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Why upgrade</Text>
            <View style={styles.featureList}>
              {FEATURE_ITEMS.map((item) => (
                <View key={item} style={styles.featureRow}>
                  <View style={styles.featureDot} />
                  <Text style={styles.featureText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Current access</Text>
            <Text style={styles.cardBody}>
              {hasPaidAccess(subscription)
                ? 'Your paid access is active on mobile. You can manage renewals or restore prior purchases at any time.'
                : 'You are on the free tier. Upgrade to unlock the full recommendation engine and native planning controls.'}
            </Text>
            <View style={styles.statusRow}>
              <View style={styles.statusChip}>
                <Text style={styles.statusChipLabel}>
                  {subscription?.tier === 'free' ? 'Free' : 'Pro'}
                </Text>
              </View>
              <View style={styles.statusChip}>
                <Text style={styles.statusChipLabel}>
                  {subscription?.status ?? 'unknown'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Choose your plan</Text>
            <Text style={styles.cardBody}>
              {annualSavingsLabel ??
                'RevenueCat packages are loaded live for this account.'}
            </Text>

            {packages.length ? (
              <View style={styles.planStack}>
                {packages.map((pkg) => {
                  const selected = selectedPackage?.identifier === pkg.identifier;
                  const trialLabel = getTrialLabel(pkg);

                  return (
                    <Pressable
                      key={pkg.identifier}
                      onPress={() => setSelectedPackageIdentifier(pkg.identifier)}
                      style={({ pressed }) => [
                        styles.planCard,
                        selected ? styles.planCardSelected : null,
                        pressed ? styles.planCardPressed : null,
                      ]}
                    >
                      <View style={styles.planHeader}>
                        <Text style={styles.planTitle}>{getPackageTitle(pkg)}</Text>
                        {selected ? (
                          <View style={styles.selectedBadge}>
                            <Text style={styles.selectedBadgeLabel}>SELECTED</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.planPrice}>{pkg.product.priceString}</Text>
                      <Text style={styles.planMeta}>
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

          <View style={styles.actionRow}>
            <Pressable
              disabled={!selectedPackage || workingAction === 'purchase'}
              onPress={() => {
                void handlePurchase();
              }}
              style={({ pressed }) => [
                styles.primaryButton,
                (!selectedPackage || workingAction === 'purchase')
                  ? styles.buttonDisabled
                  : null,
                pressed ? styles.primaryButtonPressed : null,
              ]}
            >
              <Text style={styles.primaryButtonLabel}>
                {workingAction === 'purchase' ? 'Subscribing…' : 'Subscribe now'}
              </Text>
            </Pressable>

            <Pressable
              disabled={workingAction === 'restore'}
              onPress={() => {
                void handleRestore();
              }}
              style={({ pressed }) => [
                styles.secondaryButton,
                workingAction === 'restore' ? styles.buttonDisabled : null,
                pressed ? styles.secondaryButtonPressed : null,
              ]}
            >
              <Text style={styles.secondaryButtonLabel}>
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
                workingAction === 'manage' ? styles.buttonDisabled : null,
                pressed ? styles.secondaryButtonPressed : null,
              ]}
            >
              <Text style={styles.secondaryButtonLabel}>
                {workingAction === 'manage'
                  ? 'Opening…'
                  : hasPaidAccess(subscription)
                    ? 'Manage subscription'
                    : 'Open subscription center'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.legalRow}>
            <Pressable onPress={() => openLegal('/legal/terms')}>
              <Text style={styles.legalLink}>Terms</Text>
            </Pressable>
            <Pressable onPress={() => openLegal('/legal/privacy')}>
              <Text style={styles.legalLink}>Privacy</Text>
            </Pressable>
            <Pressable onPress={() => router.back()}>
              <Text style={styles.legalLink}>Close</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    gap: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  card: {
    backgroundColor: 'rgba(8, 15, 24, 0.88)',
    borderColor: 'rgba(125, 211, 252, 0.14)',
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    padding: 22,
  },
  cardBody: {
    color: '#cbd5e1',
    fontSize: 15,
    lineHeight: 22,
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    gap: 18,
    padding: 24,
  },
  eyebrow: {
    color: '#7dd3fc',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  featureDot: {
    backgroundColor: '#2dd4bf',
    borderRadius: 999,
    height: 8,
    width: 8,
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
    color: '#e2e8f0',
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
  },
  gradient: {
    flex: 1,
  },
  hero: {
    gap: 10,
  },
  legalLink: {
    color: '#7dd3fc',
    fontSize: 13,
    fontWeight: '600',
  },
  legalRow: {
    flexDirection: 'row',
    gap: 18,
    justifyContent: 'center',
  },
  meta: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '600',
  },
  planCard: {
    backgroundColor: 'rgba(7, 15, 23, 0.88)',
    borderColor: 'rgba(148, 163, 184, 0.12)',
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  planCardPressed: {
    opacity: 0.94,
  },
  planCardSelected: {
    backgroundColor: 'rgba(14, 116, 144, 0.18)',
    borderColor: 'rgba(125, 211, 252, 0.38)',
  },
  planHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  planMeta: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
  },
  planPrice: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1.2,
  },
  planStack: {
    gap: 12,
  },
  planTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#7dd3fc',
    borderRadius: 18,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 20,
  },
  primaryButtonLabel: {
    color: '#082f49',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.992 }],
  },
  safeArea: {
    flex: 1,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: 'rgba(148, 163, 184, 0.24)',
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 20,
  },
  secondaryButtonLabel: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButtonPressed: {
    opacity: 0.82,
  },
  selectedBadge: {
    backgroundColor: '#7dd3fc',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  selectedBadgeLabel: {
    color: '#082f49',
    fontSize: 11,
    fontWeight: '800',
  },
  sessionMeta: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '500',
  },
  stateWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  statusChip: {
    backgroundColor: 'rgba(45, 212, 191, 0.12)',
    borderColor: 'rgba(45, 212, 191, 0.18)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusChipLabel: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 15,
    lineHeight: 22,
  },
  title: {
    color: '#f8fafc',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.9,
    lineHeight: 36,
  },
});
