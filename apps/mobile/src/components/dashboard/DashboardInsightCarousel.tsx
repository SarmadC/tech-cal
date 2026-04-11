import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type {
  MobileDashboardFunnelInsight,
  MobileDashboardPipelineInsight,
} from '@kurecal/domain';

import { DashboardCard } from './DashboardCard';
import { useAppTheme } from '../../providers/ThemeProvider';

export function DashboardInsightCarousel({
  pipeline,
  funnel,
}: {
  pipeline: MobileDashboardPipelineInsight;
  funnel: MobileDashboardFunnelInsight;
}) {
  const { tokens } = useAppTheme();
  const funnelTotal = funnel.savedOnly + funnel.rsvped + funnel.attended;
  const funnelColumns = [
    { label: 'Saved', value: funnel.savedOnly },
    { label: 'RSVP', value: funnel.rsvped },
    { label: 'Attended', value: funnel.attended },
  ];
  const funnelMax = Math.max(...funnelColumns.map((column) => column.value), 0);
  const pipelineBarMax = Math.max(...pipeline.topEvents.map((event) => event.score), 0);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <DashboardCard style={[styles.carouselCard, styles.pipelineCard]}>
        <View style={styles.cardHeader}>
          <View>
            <Text
              style={{
                color: tokens.colors.textSecondary,
                fontFamily: tokens.typography.sans,
                fontSize: 12,
                fontWeight: '700',
              }}
            >
              Pipeline Health
            </Text>
            <Text
              style={{
                color: tokens.colors.textPrimary,
                fontFamily: tokens.typography.sans,
                fontSize: 34,
                fontWeight: '800',
                letterSpacing: -1,
              }}
            >
              {pipeline.scoredUpcomingCount > 0 ? pipeline.avgScore : '—'}
            </Text>
          </View>
        </View>

        <Text
          style={{
            color: tokens.colors.textSecondary,
            fontFamily: tokens.typography.sans,
            fontSize: 12,
            lineHeight: 18,
          }}
        >
          {pipeline.trackedUpcomingCount === 0
            ? 'Save or RSVP to upcoming events to score your pipeline.'
            : `${pipeline.highFitCount} high-fit of ${pipeline.trackedUpcomingCount} upcoming commitments`}
        </Text>

        <View style={styles.pipelineList}>
          {pipeline.topEvents.length > 0 ? (
            pipeline.topEvents.map((event) => {
              const width =
                (pipelineBarMax > 0
                  ? `${Math.max(
                      18,
                      Math.round((event.score / pipelineBarMax) * 100)
                    )}%`
                  : '18%') as `${number}%`;
              return (
                <View key={event.eventId} style={styles.pipelineItem}>
                  <View style={styles.pipelineCopy}>
                    <Text
                      numberOfLines={1}
                      style={{
                        color: tokens.colors.textPrimary,
                        fontFamily: tokens.typography.sans,
                        fontSize: 13,
                        fontWeight: '700',
                      }}
                    >
                      {event.title}
                    </Text>
                    <View
                      style={[
                        styles.pipelineTrack,
                        { backgroundColor: tokens.colors.surfaceMuted },
                      ]}
                    >
                      <View
                        style={[
                          styles.pipelineFill,
                          {
                            width,
                            backgroundColor: tokens.colors.accent,
                          },
                        ]}
                      />
                    </View>
                  </View>
                  <Text
                    style={{
                      color: tokens.colors.accent,
                      fontFamily: tokens.typography.mono,
                      fontSize: 12,
                      fontWeight: '700',
                    }}
                  >
                    {event.score}
                  </Text>
                </View>
              );
            })
          ) : (
            <Text
              style={{
                color: tokens.colors.textSecondary,
                fontFamily: tokens.typography.sans,
                fontSize: 12,
                lineHeight: 18,
              }}
            >
              No scored commitments yet.
            </Text>
          )}
        </View>
      </DashboardCard>

      <DashboardCard style={styles.carouselCard}>
        <View style={styles.cardHeader}>
          <View>
            <Text
              style={{
                color: tokens.colors.textSecondary,
                fontFamily: tokens.typography.sans,
                fontSize: 12,
                fontWeight: '700',
              }}
            >
              Follow-through Funnel
            </Text>
            <Text
              style={{
                color: tokens.colors.textPrimary,
                fontFamily: tokens.typography.sans,
                fontSize: 34,
                fontWeight: '800',
                letterSpacing: -1,
              }}
            >
              {funnelTotal > 0 ? funnel.attended : '—'}
            </Text>
          </View>
        </View>

        <Text
          style={{
            color: tokens.colors.textSecondary,
            fontFamily: tokens.typography.sans,
            fontSize: 12,
            lineHeight: 18,
          }}
        >
          {funnelTotal > 0
            ? `Last 90 days · ${funnel.attended} attended from saved and RSVP activity`
            : 'Save, RSVP, and attend events to build a follow-through story.'}
        </Text>

        {funnelTotal > 0 ? (
          <View style={styles.funnelChart}>
            {funnelColumns.map((column) => {
              const height = funnelMax > 0 ? Math.max(12, Math.round((column.value / funnelMax) * 72)) : 12;
              return (
                <View key={column.label} style={styles.funnelColumn}>
                  <View style={styles.funnelBarWrap}>
                    <View
                      style={[
                        styles.funnelBar,
                        {
                          height,
                          backgroundColor:
                            column.label === 'Attended'
                              ? '#34d399'
                              : column.label === 'RSVP'
                                ? tokens.colors.accent
                                : tokens.colors.textSecondary,
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={{
                      color: tokens.colors.textPrimary,
                      fontFamily: tokens.typography.sans,
                      fontSize: 12,
                      fontWeight: '700',
                    }}
                  >
                    {column.value}
                  </Text>
                  <Text
                    style={{
                      color: tokens.colors.textSecondary,
                      fontFamily: tokens.typography.sans,
                      fontSize: 11,
                      fontWeight: '600',
                    }}
                  >
                    {column.label}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}
      </DashboardCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: 12,
    paddingBottom: 4,
    paddingRight: 16,
  },
  carouselCard: {
    width: 292,
    gap: 14,
  },
  pipelineCard: {
    minHeight: 246,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pipelineList: {
    gap: 12,
  },
  pipelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pipelineCopy: {
    flex: 1,
    gap: 6,
  },
  pipelineTrack: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  pipelineFill: {
    height: '100%',
    borderRadius: 999,
  },
  funnelChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 8,
  },
  funnelColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  funnelBarWrap: {
    height: 72,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  funnelBar: {
    width: 26,
    borderRadius: 999,
  },
});
