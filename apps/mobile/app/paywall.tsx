import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KureButton } from '@/components/chrome/KureButton';
import { KureCard } from '@/components/chrome/KureCard';
import { HeaderActionButton } from '@/components/chrome/MobilePage';
import { KureScreen } from '@/components/chrome/KureScreen';
import { SectionHeading } from '@/components/chrome/SectionHeading';
import { getApiBaseUrl } from '@/lib/env';
import { mobileQueryKeys } from '@/lib/queryKeys';
import { mobileQueryStaleTimes } from '@/lib/queryClient';
import {
  getKureCalOfferingPackages,
  isRevenueCatPurchaseCancelled,
  presentKureCalCustomerCenter,
  purchaseRevenueCatPackage,
  restoreRevenueCatPurchases,
} from '@/lib/revenuecat';
import { useAppTheme } from '@/providers/ThemeProvider';

type RevenueCatPackage = Awaited<ReturnType<typeof getKureCalOfferingPackages>>[number];

const FEATURE_ITEMS = [
  'Full recommendation engine',
  'Calendar sync and native planning',
  'Unlimited saved events',
  'Advanced insight surfaces',
] as const;

function formatPeriodLabel(unit: string, units: number): string {
  if (unit === 'DAY' && units % 7 === 0) {
    const weeks = Math.max(1, Math.floor(units / 7));
    return weeks + ' week' + (weeks > 1 ? 's' : '');
  }

  const lower = unit.toLowerCase();
  return units + ' ' + lower + (units > 1 ? 's' : '');
}

function getTrialLabel(pkg: RevenueCatPackage): string | null {
  const intro = pkg.product.introPrice;
  if (!intro || intro.price > 0) {
    return null;
  }

  const cycles = Math.max(1, intro.cycles ?? 1);
  const units = Math.max(1, intro.periodNumberOfUnits ?? 1) * cycles;
  return 'Free ' + formatPeriodLabel(intro.periodUnit, units) + ' trial';
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

function formatCurrency(value: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return currencyCode + ' ' + value.toFixed(2);
  }
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

  return 'Save ' + formatCurrency(savings, annual.product.currencyCode);
}

export default function PaywallScreen() {
  const queryClient = useQueryClient();
  const { tokens } = useAppTheme();
  const [selectedPackageIdentifier, setSelectedPackageIdentifier] = useState<string | null>(null);

  const packagesQuery = useQuery({
    queryKey: mobileQueryKeys.subscription.offerings(),
    staleTime: mobileQueryStaleTimes.long,
    queryFn: getKureCalOfferingPackages,
  });

  useEffect(() => {
    if (!packagesQuery.data?.length || selectedPackageIdentifier) {
      return;
    }

    const preferredMonthly =
      packagesQuery.data.find((pkg) => pkg.packageType === 'MONTHLY') ?? packagesQuery.data[0];
    setSelectedPackageIdentifier(preferredMonthly.identifier);
  }, [packagesQuery.data, selectedPackageIdentifier]);

  const selectedPackage = useMemo(
    () =>
      packagesQuery.data?.find((pkg) => pkg.identifier === selectedPackageIdentifier) ??
      packagesQuery.data?.[0] ??
      null,
    [packagesQuery.data, selectedPackageIdentifier]
  );

  const annualSavingsLabel = useMemo(
    () => (packagesQuery.data ? getAnnualSavingsLabel(packagesQuery.data) : null),
    [packagesQuery.data]
  );

  const purchaseMutation = useMutation({
    mutationFn: async (pkg: RevenueCatPackage) => purchaseRevenueCatPackage(pkg),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: mobileQueryKeys.subscription.status() });
      Alert.alert('Subscription active', 'Kure-Cal Pro is now active.');
      router.back();
    },
    onError: (error) => {
      if (isRevenueCatPurchaseCancelled(error)) {
        return;
      }
      Alert.alert('Purchase failed', error instanceof Error ? error.message : 'Unknown error');
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      await restoreRevenueCatPurchases();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: mobileQueryKeys.subscription.status() });
      Alert.alert('Restore complete', 'Your RevenueCat purchases were restored.');
    },
  });

  const customerCenterMutation = useMutation({
    mutationFn: async () => {
      await presentKureCalCustomerCenter();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: mobileQueryKeys.subscription.status() });
    },
  });

  function openLegal(path: string) {
    void Linking.openURL(getApiBaseUrl() + path).catch((error) => {
      Alert.alert('Unable to open link', error instanceof Error ? error.message : 'Unknown error');
    });
  }

  return (
    <KureScreen
      title="Upgrade without leaving the app"
      subtitle="The mobile shell uses the same subscription state as web, but the offer now lives inside the monochrome native system."
      action={<HeaderActionButton label="Close" onPress={() => router.back()} />}
    >
      <KureCard>
        <SectionHeading
          eyebrow="Kure-Cal Pro"
          title="Turn ranked opportunities into planned moves"
          detail="Unlock the full recommendation engine, richer planning controls, and a cleaner path from discovery to commitment."
        />
        <View style={styles.featureList}>
          {FEATURE_ITEMS.map((item) => (
            <View key={item} style={styles.featureRow}>
              <View style={[styles.featureDot, { backgroundColor: tokens.colors.accent }]} />
              <Text style={{ color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans, fontSize: 15, lineHeight: 20 }}>
                {item}
              </Text>
            </View>
          ))}
        </View>
      </KureCard>

      <KureCard>
        <SectionHeading
          eyebrow="Plans"
          title="Choose your billing cycle"
          detail={annualSavingsLabel ?? 'RevenueCat packages are loaded live for this account.'}
        />
        {packagesQuery.isLoading ? <ActivityIndicator color={tokens.colors.accent} /> : null}
        {packagesQuery.isError ? (
          <Text style={{ color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans, lineHeight: 20 }}>
            Unable to load plans. Pull to retry or re-open the paywall.
          </Text>
        ) : null}
        <View style={styles.planStack}>
          {packagesQuery.data?.map((pkg) => {
            const selected = selectedPackage?.identifier === pkg.identifier;
            const title = getPackageTitle(pkg);
            const trialLabel = getTrialLabel(pkg);
            return (
              <Pressable
                key={pkg.identifier}
                onPress={() => setSelectedPackageIdentifier(pkg.identifier)}
                style={[
                  styles.planCard,
                  {
                    backgroundColor: selected ? tokens.colors.accentSoft : tokens.colors.input,
                    borderColor: selected ? tokens.colors.accent : tokens.colors.border,
                    borderRadius: tokens.radius.md,
                  },
                ]}
              >
                <View style={styles.planHeader}>
                  <Text style={{ color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans, fontSize: 20, fontWeight: '800' }}>
                    {title}
                  </Text>
                  {selected ? (
                    <View style={[styles.selectedBadge, { backgroundColor: tokens.colors.accent }]}> 
                      <Text style={{ color: tokens.colors.textInverse, fontFamily: tokens.typography.sans, fontSize: 11, fontWeight: '800' }}>
                        SELECTED
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={{ color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans, fontSize: 28, fontWeight: '800' }}>
                  {pkg.product.priceString}
                </Text>
                <Text style={{ color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans, fontSize: 14, lineHeight: 20 }}>
                  {trialLabel ?? (title === 'Yearly' ? 'Billed annually' : 'Billed monthly')}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.buttonStack}>
          <KureButton
            disabled={!selectedPackage || purchaseMutation.isPending}
            onPress={() => {
              if (!selectedPackage) {
                return;
              }
              purchaseMutation.mutate(selectedPackage);
            }}
          >
            {purchaseMutation.isPending ? 'Subscribing...' : 'Subscribe now'}
          </KureButton>
          <KureButton
            variant="secondary"
            onPress={() =>
              restoreMutation.mutateAsync().catch((error: unknown) => {
                Alert.alert('Restore failed', error instanceof Error ? error.message : 'Unknown error');
              })
            }
          >
            {restoreMutation.isPending ? 'Restoring...' : 'Restore purchases'}
          </KureButton>
        </View>
      </KureCard>

      <KureCard>
        <SectionHeading
          eyebrow="Access"
          title="Manage or review legal details"
          detail="Customer Center and legal documents stay one tap away from the native shell."
        />
        <View style={styles.buttonStack}>
          <KureButton
            variant="secondary"
            onPress={() =>
              customerCenterMutation.mutateAsync().catch((error: unknown) => {
                Alert.alert(
                  'Unable to open subscription center',
                  error instanceof Error ? error.message : 'Unknown error'
                );
              })
            }
          >
            Manage subscription
          </KureButton>
        </View>
        <View style={styles.legalRow}>
          <Pressable onPress={() => openLegal('/legal/terms')}>
            <Text style={{ color: tokens.colors.link, fontFamily: tokens.typography.sans, fontSize: 13 }}>Terms</Text>
          </Pressable>
          <Pressable onPress={() => openLegal('/legal/privacy')}>
            <Text style={{ color: tokens.colors.link, fontFamily: tokens.typography.sans, fontSize: 13 }}>Privacy</Text>
          </Pressable>
        </View>
      </KureCard>
    </KureScreen>
  );
}

const styles = StyleSheet.create({
  featureList: {
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  planStack: {
    gap: 12,
  },
  planCard: {
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  selectedBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  buttonStack: {
    gap: 10,
  },
  legalRow: {
    flexDirection: 'row',
    gap: 16,
  },
});
