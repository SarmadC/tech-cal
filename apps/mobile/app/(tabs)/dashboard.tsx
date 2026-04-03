import { useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type {
  MobileDashboardSummary,
  NormalizedSubscription,
} from '@kurecal/domain';

import { EventSummaryCard } from '../../src/components/EventSummaryCard';
import { ScreenStateView } from '../../src/components/ScreenStateView';
import { useAuth } from '../../src/context/AuthProvider';
import {
  loadMobileDashboardSummary,
  loadMobileSubscriptionStatus,
} from '../../src/lib/mobileApi';

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function SectionHeader({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

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

export default function DashboardScreen() {
  const { session } = useAuth();
  const [data, setData] = useState<MobileDashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscription, setSubscription] = useState<NormalizedSubscription | null>(
    null
  );

  async function loadSummary(mode: 'initial' | 'refresh' = 'initial') {
    if (mode === 'refresh') {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [summaryResult, subscriptionResult] = await Promise.allSettled([
        loadMobileDashboardSummary(),
        loadMobileSubscriptionStatus(),
      ]);

      if (summaryResult.status === 'rejected') {
        throw summaryResult.reason;
      }

      setData(summaryResult.value);
      if (subscriptionResult.status === 'fulfilled') {
        setSubscription(subscriptionResult.value);
      }
      setError(null);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to load your dashboard'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadSummary();
  }, []);

  if (loading && !data) {
    return (
      <LinearGradient colors={['#04151f', '#031018', '#02060b']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.stateWrap}>
            <ScreenStateView
              mode="loading"
              title="Loading your runway"
              description="Pulling your next events and recommended openings."
            />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (error && !data) {
    return (
      <LinearGradient colors={['#04151f', '#031018', '#02060b']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.stateWrap}>
            <ScreenStateView
              mode="error"
              title="Dashboard unavailable"
              description={error}
              onRetry={() => {
                void loadSummary();
              }}
            />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const header = data?.header ?? {
    eyebrow: 'Dashboard',
    title: 'Your event runway',
    subtitle: null,
  };
  const heroEvent = data?.heroEvent ?? null;
  const upcomingEvents = data?.upcomingEvents ?? [];
  const recommendedEvents = data?.recommendedEvents ?? [];

  return (
    <LinearGradient colors={['#04151f', '#031018', '#02060b']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void loadSummary('refresh');
              }}
              tintColor="#2dd4bf"
            />
          }
        >
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>{header.eyebrow}</Text>
            <Text style={styles.title}>{header.title}</Text>
            {header.subtitle ? (
              <Text style={styles.subtitle}>{header.subtitle}</Text>
            ) : null}
            <Text style={styles.sessionMeta}>
              Signed in as {session?.user.email ?? 'unknown user'}
            </Text>
          </View>

          <View style={styles.metricsRow}>
            <MetricCard label="Upcoming" value={data?.upcomingCount ?? 0} />
            <MetricCard label="Saved" value={data?.savedCount ?? 0} />
            <MetricCard
              label="Recommended"
              value={data?.recommendationCount ?? 0}
            />
          </View>

          {subscription ? (
            hasPaidAccess(subscription) ? (
              <View style={styles.subscriptionCard}>
                <Text style={styles.subscriptionEyebrow}>Pro active</Text>
                <Text style={styles.subscriptionTitle}>
                  Your upgraded planning tools are unlocked
                </Text>
                <Text style={styles.subscriptionDescription}>
                  Calendar sync, unlimited saved events, and the full recommendation
                  engine are available on this device.
                </Text>
                <Pressable
                  onPress={() => router.push('../paywall')}
                  style={({ pressed }) => [
                    styles.secondaryAction,
                    pressed ? styles.secondaryActionPressed : null,
                  ]}
                >
                  <Text style={styles.secondaryActionLabel}>Manage plan</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => router.push('../paywall')}
                style={({ pressed }) => [
                  styles.subscriptionCard,
                  styles.subscriptionCardHighlight,
                  pressed ? styles.subscriptionCardPressed : null,
                ]}
              >
                <Text style={styles.subscriptionEyebrow}>Upgrade</Text>
                <Text style={styles.subscriptionTitle}>
                  Unlock the full KureCal mobile system
                </Text>
                <Text style={styles.subscriptionDescription}>
                  Upgrade to Pro for calendar sync, unlimited saved events, and
                  the full recommendation engine.
                </Text>
                <Text style={styles.subscriptionLink}>Open paywall</Text>
              </Pressable>
            )
          ) : null}

          <View style={styles.actionRow}>
            <Pressable
              onPress={() => router.push('./calendar')}
              style={({ pressed }) => [
                styles.primaryAction,
                pressed ? styles.primaryActionPressed : null,
              ]}
            >
              <Text style={styles.primaryActionLabel}>Open calendar</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('./submit-event')}
              style={({ pressed }) => [
                styles.secondaryAction,
                pressed ? styles.secondaryActionPressed : null,
              ]}
            >
              <Text style={styles.secondaryActionLabel}>Submit an event</Text>
            </Pressable>
          </View>

          {heroEvent ? (
            <View style={styles.section}>
              <SectionHeader eyebrow="Next up" title="Hero event" />
              <EventSummaryCard
                event={heroEvent}
                onPress={() =>
                  router.push({
                    pathname: '../event/[id]',
                    params: { id: heroEvent.id },
                  })
                }
                tone="highlight"
              />
            </View>
          ) : null}

          <View style={styles.section}>
            <SectionHeader eyebrow="Tracked" title="Upcoming events" />
            {upcomingEvents.length > 0 ? (
              upcomingEvents.map((event) => (
                <EventSummaryCard
                  key={event.id}
                  event={event}
                  onPress={() =>
                    router.push({
                      pathname: '../event/[id]',
                      params: { id: event.id },
                    })
                  }
                />
              ))
            ) : (
              <ScreenStateView
                mode="empty"
                title="No upcoming events yet"
                description="Save or RSVP to events from Discover and they will show up here."
              />
            )}
          </View>

          <View style={styles.section}>
            <SectionHeader eyebrow="Catalog" title="Recommended openings" />
            {recommendedEvents.length > 0 ? (
              recommendedEvents.map((event) => (
                <EventSummaryCard
                  key={event.id}
                  event={event}
                  onPress={() =>
                    router.push({
                      pathname: '../event/[id]',
                      params: { id: event.id },
                    })
                  }
                />
              ))
            ) : (
              <ScreenStateView
                mode="empty"
                title="Recommendations will land here"
                description="Once the adapter has more matching inventory, this panel will surface fresh events."
              />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  content: {
    gap: 18,
    padding: 22,
  },
  eyebrow: {
    color: '#2dd4bf',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  gradient: {
    flex: 1,
  },
  hero: {
    gap: 10,
  },
  metricCard: {
    backgroundColor: 'rgba(7, 15, 23, 0.88)',
    borderColor: 'rgba(148, 163, 184, 0.12)',
    borderRadius: 22,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    padding: 16,
  },
  metricLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  metricValue: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1.2,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: '#2dd4bf',
    borderRadius: 18,
    flex: 1,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 16,
  },
  primaryActionLabel: {
    color: '#042f2e',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryActionPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.992 }],
  },
  safeArea: {
    flex: 1,
  },
  secondaryAction: {
    alignItems: 'center',
    borderColor: 'rgba(148, 163, 184, 0.24)',
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 16,
  },
  secondaryActionLabel: {
    color: '#dbeafe',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryActionPressed: {
    opacity: 0.92,
  },
  section: {
    gap: 12,
  },
  sectionEyebrow: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  sectionHeader: {
    gap: 4,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
  },
  sessionMeta: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '500',
  },
  stateWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: 22,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 15,
    lineHeight: 22,
  },
  subscriptionCard: {
    backgroundColor: 'rgba(7, 15, 23, 0.88)',
    borderColor: 'rgba(148, 163, 184, 0.12)',
    borderRadius: 22,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  subscriptionCardHighlight: {
    borderColor: 'rgba(45, 212, 191, 0.3)',
    backgroundColor: 'rgba(6, 78, 59, 0.34)',
  },
  subscriptionCardPressed: {
    opacity: 0.92,
  },
  subscriptionDescription: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 21,
  },
  subscriptionEyebrow: {
    color: '#7dd3fc',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  subscriptionLink: {
    color: '#7dd3fc',
    fontSize: 13,
    fontWeight: '700',
  },
  subscriptionTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
  },
  title: {
    color: '#f8fafc',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.9,
    lineHeight: 36,
  },
});
