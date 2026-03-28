import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { HeaderActionButton, MobilePage } from '@/components/chrome/MobilePage';
import { InlineNotice } from '@/components/chrome/InlineNotice';
import { ScreenState } from '@/components/chrome/ScreenState';
import { SectionCard } from '@/components/chrome/SectionCard';
import { SectionHeading } from '@/components/chrome/SectionHeading';
import { MetricTile } from '@/components/chrome/MetricTile';
import { EventCard } from '@/components/lists/EventCard';
import { KureButton } from '@/components/chrome/KureButton';
import { getMobileApiClient } from '@/lib/mobileApi';
import { mobileQueryKeys } from '@/lib/queryKeys';
import { mobileQueryStaleTimes } from '@/lib/queryClient';

export default function DashboardScreen() {
  const dashboardQuery = useQuery({
    queryKey: mobileQueryKeys.dashboard.home(),
    staleTime: mobileQueryStaleTimes.medium,
    queryFn: async () => {
      const result = await getMobileApiClient().getDashboardHome();
      if (!result.success) {
        throw new Error(result.error ?? 'Unable to load dashboard');
      }
      return result.data;
    },
  });

  const dashboard = dashboardQuery.data;

  return (
    <MobilePage
      eyebrow={dashboard?.hero.eyebrow ?? 'Dashboard'}
      title={dashboard?.hero.title ?? 'Dashboard'}
      subtitle={dashboard?.hero.subtitle ?? 'Your mobile planning snapshot.'}
      action={<HeaderActionButton label="Settings" onPress={() => router.push('../settings')} />}
    >
      {dashboardQuery.isLoading ? (
        <ScreenState
          mode="loading"
          title="Loading dashboard"
          description="Pulling your latest planning snapshot."
        />
      ) : null}

      {dashboard?.hero.highlight ? (
        <SectionCard
          eyebrow="Highlight"
          title={dashboard.hero.highlight}
          detail="The highest-signal opportunity currently at the top of your mobile stack."
        />
      ) : null}

      {dashboard ? (
        <View style={styles.metricGrid}>
          {dashboard.metrics.map((metric) => (
            <View key={metric.id} style={styles.metricCell}>
              <MetricTile label={metric.label} value={metric.value} detail={metric.detail} />
            </View>
          ))}
        </View>
      ) : null}

      {dashboard?.recommendations.length ? (
        <View style={styles.stack}>
          <SectionHeading title={dashboard.recommendationsLabel} detail="High-signal opportunities coming directly from the recommendation engine." />
          {dashboard.recommendations.map((event) => (
            <EventCard key={event.id} event={event} onPress={() => router.push(`/event/${event.id}`)} />
          ))}
        </View>
      ) : null}

      {dashboard?.upcoming.length ? (
        <View style={styles.stack}>
          <SectionHeading title={dashboard.upcomingLabel} detail="Events already connected to your personal planning flow." />
          {dashboard.upcoming.map((event) => (
            <EventCard key={event.id} event={event} onPress={() => router.push(`/event/${event.id}`)} />
          ))}
        </View>
      ) : null}

      {dashboard ? (
        <SectionCard
          title="Career onboarding"
          detail="The same recommendation profile state that powers the rest of the app."
        >
          <InlineNotice
            title={dashboard.onboardingState.title}
            description={dashboard.onboardingState.body}
          />
          {dashboard.onboardingState.ctaLabel ? (
            <KureButton onPress={() => router.push('/onboarding?resume=1')}>{dashboard.onboardingState.ctaLabel}</KureButton>
          ) : null}
        </SectionCard>
      ) : null}

      {dashboardQuery.isError ? (
        <ScreenState
          mode="error"
          title="Dashboard unavailable"
          description={
            dashboardQuery.error instanceof Error
              ? dashboardQuery.error.message
              : 'Try again in a moment.'
          }
        />
      ) : null}
    </MobilePage>
  );
}

const styles = StyleSheet.create({
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  metricCell: {
    width: '48%',
  },
  stack: {
    gap: 12,
  },
});
