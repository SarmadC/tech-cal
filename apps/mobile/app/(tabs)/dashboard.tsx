import { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

import type {
  MobileCommunityNetworkingSpeakerMatch,
  MobileDashboardSummary,
} from '@kurecal/domain';

import {
  HeaderActionButton,
  MobilePage,
} from '../../src/components/chrome/MobilePage';
import { InlineNotice } from '../../src/components/chrome/InlineNotice';
import { KureButton } from '../../src/components/chrome/KureButton';
import { DashboardNetworkPulseCard } from '../../src/components/dashboard/DashboardNetworkPulseCard';
import { ScreenState } from '../../src/components/chrome/ScreenState';
import { DashboardRecommendationsCarousel } from '../../src/components/dashboard/DashboardRecommendationsCarousel';
import { DashboardUpcomingCommitmentsCard } from '../../src/components/dashboard/DashboardUpcomingCommitmentsCard';
import { EventImageSurface } from '../../src/components/shared/EventImageSurface';
import {
  loadMobileCommunityHome,
  loadMobileDashboardSummary,
} from '../../src/lib/mobileApi';
import { useAppTheme } from '../../src/providers/ThemeProvider';

type DashboardAttentionItem = {
  id: string;
  tone: 'warning' | 'info';
  label: string;
  body: string;
  action: string;
  onPress: () => void;
};

function formatHeroMeta(
  startTime?: string,
  location?: string | null,
  daysUntil?: number
) {
  if (!startTime) {
    return null;
  }

  const start = new Date(startTime);
  const dateLabel = start.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const parts = [dateLabel];
  if (location?.trim()) {
    parts.push(location.trim());
  }
  if (typeof daysUntil === 'number') {
    parts.push(daysUntil === 0 ? 'Today' : `${daysUntil} days away`);
  }

  return parts.join(' • ');
}

export default function DashboardScreen() {
  const { tokens, resolvedTheme } = useAppTheme();
  const [data, setData] = useState<MobileDashboardSummary | null>(null);
  const [speakerMatches, setSpeakerMatches] = useState<
    MobileCommunityNetworkingSpeakerMatch[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadSummary() {
    setLoading(true);

    try {
      const [summaryResult, communityResult] = await Promise.allSettled([
        loadMobileDashboardSummary(),
        loadMobileCommunityHome(),
      ]);

      if (summaryResult.status !== 'fulfilled') {
        throw summaryResult.reason;
      }

      const summary = summaryResult.value;
      const nextSpeakerMatches =
        communityResult.status === 'fulfilled'
          ? (() => {
              const seen = new Set<string>();
              return (communityResult.value.speakerMatches ?? []).filter((match) => {
                if (!match.speaker.linkedinUrl) {
                  return false;
                }

                const key = match.speaker.id || match.speaker.name;
                if (seen.has(key)) {
                  return false;
                }

                seen.add(key);
                return true;
              });
            })()
          : [];

      setData(summary);
      setSpeakerMatches(nextSpeakerMatches);
      setError(null);
    } catch (nextError) {
      setSpeakerMatches([]);
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to load dashboard'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSummary();
  }, []);

  const dashboard = data;
  const pipelineScore = dashboard?.insights?.pipeline.avgScore ?? 0;
  const highFitCount = dashboard?.insights?.pipeline.highFitCount ?? 0;
  const nextCommitment = dashboard?.upcomingCommitments?.[0] ?? null;
  const followThroughTotal = dashboard
    ? (dashboard.insights?.funnel.savedOnly ?? 0) +
      (dashboard.insights?.funnel.rsvped ?? 0) +
      (dashboard.insights?.funnel.attended ?? 0)
    : 0;
  const followThroughRate =
    dashboard && followThroughTotal > 0
      ? Math.round(
          ((dashboard.insights?.funnel.attended ?? 0) / followThroughTotal) * 100
        )
      : 0;
  const unratedAttendedCount =
    dashboard?.careerOutcomes?.unratedAttendedCount ?? 0;

  const attentionItems: DashboardAttentionItem[] = dashboard
    ? [
        !dashboard.onboardingState.hasCompleted
          ? {
              id: 'onboarding',
              tone: 'warning' as const,
              label: 'Profile incomplete',
              body: 'Finish onboarding to improve ranking and planning quality.',
              action: dashboard.onboardingState.ctaLabel ?? 'Resume onboarding',
              onPress: () =>
                router.push({
                  pathname: '/onboarding',
                  params: { resume: '1' },
                }),
            }
          : null,
        nextCommitment
          ? {
              id: 'prep',
              tone: 'info' as const,
              label: nextCommitment.event.title,
              body: nextCommitment.daysUntil === 0
                ? 'Happening today'
                : `Coming up in ${nextCommitment.daysUntil} day${nextCommitment.daysUntil === 1 ? '' : 's'}`,
              action: 'Open event',
              onPress: () =>
                router.push({
                  pathname: '/event/[id]',
                  params: { id: nextCommitment.event.id },
                }),
            }
          : null,
        dashboard.careerOutcomes?.nextEventToRate
          ? {
              id: 'feedback',
              tone: 'warning' as const,
              label: 'Feedback needed',
              body: dashboard.careerOutcomes.nextEventToRate.title,
              action: 'Open event',
              onPress: () =>
                router.push({
                  pathname: '/event/[id]',
                  params: { id: dashboard.careerOutcomes?.nextEventToRate?.id ?? '' },
                }),
            }
          : null,
      ].filter((item): item is DashboardAttentionItem => item !== null)
    : [];
  const primaryAttention = attentionItems[0] ?? null;
  const secondaryAttentionCount = Math.max(0, attentionItems.length - 1);
  const pipelineStatus =
    pipelineScore >= 67 ? 'Strong' : pipelineScore >= 33 ? 'Fair' : 'Low';
  const pipelineStatusColor =
    pipelineScore >= 67
      ? tokens.colors.success
      : pipelineScore >= 33
        ? tokens.colors.accent
        : tokens.colors.warning;
  const funnelValues = dashboard?.insights?.funnel
    ? [
        dashboard.insights.funnel.savedOnly,
        dashboard.insights.funnel.rsvped,
        dashboard.insights.funnel.attended,
      ]
    : [0, 0, 0];
  const pendingConversion = Math.max(0, funnelValues[1] - funnelValues[2]);
  const topRecommendation = dashboard?.topRecommendation ?? null;
  const heroEyebrow = topRecommendation
    ? null
    : primaryAttention
      ? 'Needs attention'
      : 'Next move';
  const heroTitle = topRecommendation
    ? topRecommendation.event.title
    : primaryAttention
      ? primaryAttention.label
      : 'Nothing urgent. Your next strong-fit event is one tap away.';
  const heroMeta = topRecommendation
    ? formatHeroMeta(
        topRecommendation.event.startTime,
        topRecommendation.event.location,
        topRecommendation.daysUntil
      )
    : null;
  const recommendationScore =
    typeof topRecommendation?.event.score === 'number'
      ? Math.round(topRecommendation.event.score)
      : null;
  const heroBadgeLabel = topRecommendation
    ? recommendationScore != null
      ? `${recommendationScore}% Match`
      : topRecommendation.impactLabel ?? 'Strong fit'
    : null;
  const heroBody = topRecommendation
    ? null
    : primaryAttention
      ? primaryAttention.body
      : dashboard?.monthlyPulse?.deltaLabel ??
        'Stay in motion by checking the latest relevant events in Discover.';
  const heroCtaPress = topRecommendation
    ? () =>
        router.push({
          pathname: '/event/[id]',
          params: { id: topRecommendation.event.id },
        })
    : primaryAttention
      ? primaryAttention.onPress
      : () => router.push('/discover');

  return (
    <MobilePage
      title="Dashboard"
      headerHidden
      showAccentGlow={false}
      contentStyle={styles.pageContent}
    >
      <LinearGradient
        colors={
          resolvedTheme === 'light'
            ? ['rgba(37,99,235,0.06)', 'rgba(255,255,255,0)']
            : ['rgba(96,165,250,0.10)', 'rgba(5,6,7,0)']
        }
        style={styles.pageGlow}
        start={{ x: 0.12, y: 0 }}
        end={{ x: 0.85, y: 1 }}
      />
      <View style={styles.canvas}>
        <View style={styles.topBar}>
          <View />
          <HeaderActionButton
            label="Settings"
            onPress={() => router.push('../settings')}
          />
        </View>

        {loading ? (
          <ScreenState
            mode="loading"
            title="Loading dashboard"
            description="Pulling your latest planning snapshot."
            variant="plain"
          />
        ) : null}

        {!loading && error && !dashboard ? (
          <ScreenState
            mode="error"
            title="Dashboard unavailable"
            description={error}
            action={
              <KureButton variant="secondary" onPress={() => void loadSummary()}>
                Try again
              </KureButton>
            }
          />
        ) : null}

        {dashboard ? (
          <View style={styles.stack}>
            <View style={styles.statusBoard}>
              {topRecommendation ? (
                <EventImageSurface
                  event={topRecommendation.event}
                  onPress={heroCtaPress}
                  style={[
                    styles.heroStatusCard,
                    {
                      borderColor: 'rgba(245, 158, 11, 0.28)',
                    },
                  ]}
                  pressedStyle={styles.heroStatusPressed}
                >
                  <View
                    style={[
                      styles.heroImageOverlay,
                      {
                        backgroundColor:
                          resolvedTheme === 'light'
                            ? 'rgba(9, 11, 14, 0.42)'
                            : 'rgba(5, 7, 10, 0.56)',
                      },
                    ]}
                  />
                  <View style={styles.heroStatusTop}>
                    <View />
                    {heroBadgeLabel ? (
                      <View
                        style={[
                          styles.heroStatusBadge,
                          styles.heroStatusBadgeOnImage,
                        ]}
                      >
                      <Text
                        style={[
                          styles.heroStatusBadgeText,
                          {
                            color: '#F8FAFC',
                              fontFamily: tokens.typography.sans,
                            },
                      ]}
                    >
                          {heroBadgeLabel}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.heroStatusCopy}>
                    <Text
                      style={[
                        styles.heroStatusTitle,
                        {
                          color: '#F8FAFC',
                          fontFamily: tokens.typography.sans,
                        },
                      ]}
                    >
                      {heroTitle}
                    </Text>
                    {heroMeta ? (
                      <Text
                        style={[
                          styles.heroStatusMeta,
                          {
                            color: 'rgba(248, 250, 252, 0.88)',
                            fontFamily: tokens.typography.sans,
                          },
                        ]}
                      >
                        {heroMeta}
                      </Text>
                    ) : null}
                    {heroBody ? (
                      <Text
                        style={[
                          styles.heroStatusBody,
                          {
                            color: 'rgba(248, 250, 252, 0.8)',
                            fontFamily: tokens.typography.sans,
                          },
                        ]}
                        numberOfLines={2}
                      >
                        {heroBody}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.heroStatusFooter}>
                    <Text
                      style={[
                        styles.heroFooterArrow,
                        {
                          color: '#F8FAFC',
                          fontFamily: tokens.typography.mono,
                        },
                      ]}
                    >
                      →
                    </Text>
                  </View>
                </EventImageSurface>
              ) : (
                <Pressable
                  onPress={heroCtaPress}
                  style={({ pressed }) => [
                    styles.heroStatusCard,
                    {
                      borderColor: primaryAttention
                        ? 'rgba(251, 191, 36, 0.28)'
                        : tokens.colors.borderStrong,
                      backgroundColor:
                        resolvedTheme === 'light' ? '#FFF3D6' : 'rgba(43, 31, 10, 0.98)',
                    },
                    pressed && styles.heroStatusPressed,
                  ]}
                >
                  <View style={styles.heroStatusTop}>
                    <Text
                      style={[
                        styles.heroStatusEyebrow,
                        {
                          color: tokens.colors.textSecondary,
                          fontFamily: tokens.typography.sans,
                        },
                      ]}
                    >
                      {heroEyebrow}
                    </Text>
                  </View>
                  <View style={styles.heroStatusCopy}>
                    <Text
                      style={[
                        styles.heroStatusTitle,
                        {
                          color: tokens.colors.textPrimary,
                          fontFamily: tokens.typography.sans,
                        },
                      ]}
                    >
                      {heroTitle}
                    </Text>
                    <Text
                      style={[
                        styles.heroStatusBody,
                        {
                          color: tokens.colors.textSecondary,
                          fontFamily: tokens.typography.sans,
                        },
                      ]}
                      numberOfLines={3}
                    >
                      {heroBody}
                    </Text>
                  </View>
                  <View style={styles.heroStatusFooter}>
                    <Text
                      style={[
                        styles.heroFooterArrow,
                        {
                          color: tokens.colors.textSecondary,
                          fontFamily: tokens.typography.mono,
                        },
                      ]}
                    >
                      →
                    </Text>
                  </View>
                </Pressable>
              )}

              <View style={styles.statusSideColumn}>
                <View
                  style={[
                    styles.healthCard,
                    {
                      borderColor: tokens.colors.border,
                      backgroundColor:
                        resolvedTheme === 'light' ? '#CFECDD' : 'rgba(13, 34, 24, 0.98)',
                    },
                  ]}
                >
                  <View style={styles.kpiHeaderRow}>
                    <Text
                      style={[
                        styles.kpiCardLabel,
                        { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans },
                      ]}
                    >
                      Follow-through
                    </Text>
                    <Text
                      style={[
                        styles.healthValue,
                        { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans },
                      ]}
                    >
                      {followThroughTotal > 0 ? `${followThroughRate}%` : '0%'}
                    </Text>
                  </View>
                  <View style={styles.stepTrack}>
                    {(['Saved', 'RSVP', 'Attended'] as const).map((lbl, i) => (
                      <View key={lbl} style={styles.stepItem}>
                        <View style={styles.stepCountSpacer} />
                        <View
                          style={[
                            styles.stepSegment,
                            {
                              backgroundColor:
                                funnelValues[i] > 0
                                  ? tokens.colors.success
                                  : tokens.colors.borderStrong,
                              opacity: funnelValues[i] > 0 ? 1 : 0.55,
                              height: funnelValues[i] > 0 ? 16 : 8,
                            },
                          ]}
                        />
                      </View>
                    ))}
                  </View>
                  <View style={styles.stepLabelRow}>
                    {(['Saved', 'RSVP', 'Attended'] as const).map((lbl, i) => (
                      <Text
                        key={lbl}
                        style={[
                          styles.stepLabel,
                          {
                            color: tokens.colors.textSecondary,
                            fontFamily: tokens.typography.sans,
                          },
                        ]}
                      >
                        {lbl} {funnelValues[i]}
                      </Text>
                    ))}
                  </View>
                  <Text
                    style={[
                      styles.stepHelperText,
                      {
                        color: tokens.colors.textSecondary,
                        fontFamily: tokens.typography.sans,
                      },
                    ]}
                  >
                    {pendingConversion > 0
                      ? 'RSVP pending attendance'
                      : 'No pending follow-up'}
                  </Text>
                </View>

                <View style={styles.utilityRow}>
                  <View
                    style={[
                      styles.utilityCard,
                      {
                        borderColor: tokens.colors.border,
                        backgroundColor:
                          resolvedTheme === 'light' ? '#D5E4FB' : 'rgba(18, 31, 58, 0.98)',
                      },
                    ]}
                  >
                    <View style={styles.kpiHeaderRow}>
                      {pipelineScore > 0 ? (
                        <View style={styles.scoreWithDenom}>
                          <Text
                            style={[
                              styles.utilityValue,
                              { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans },
                            ]}
                          >
                            {pipelineScore}
                          </Text>
                          <Text
                            style={[
                              styles.scoreDenom,
                              { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans },
                            ]}
                          >
                            /100
                          </Text>
                        </View>
                      ) : (
                        <Text
                          style={[
                            styles.utilityValueMuted,
                            { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans },
                          ]}
                        >
                          No score yet
                        </Text>
                      )}
                      {pipelineScore > 0 ? (
                        <View
                          style={[styles.statusChip, { borderColor: pipelineStatusColor }]}
                        >
                          <Text
                            style={[
                              styles.statusChipText,
                              {
                                color: pipelineStatusColor,
                                fontFamily: tokens.typography.sans,
                              },
                            ]}
                          >
                            {pipelineStatus}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text
                      style={[
                        styles.kpiCardLabel,
                        { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans },
                      ]}
                    >
                      Relevant Events Open
                    </Text>
                    <View style={styles.utilityViz}>
                      <View
                        style={[
                          styles.healthTrack,
                          { backgroundColor: tokens.colors.borderStrong },
                        ]}
                      >
                        <View
                          style={[
                            styles.healthFill,
                            {
                              width: `${Math.max(0, Math.min(100, pipelineScore))}%`,
                              backgroundColor: pipelineStatusColor,
                            },
                          ]}
                        />
                      </View>
                      <Text
                        style={[
                          styles.barLabel,
                          {
                            color: tokens.colors.textSecondary,
                            fontFamily: tokens.typography.sans,
                            textAlign: 'left',
                            marginTop: 6,
                          },
                        ]}
                      >
                        {highFitCount > 0
                          ? `${highFitCount} high-fit event${highFitCount === 1 ? '' : 's'} open`
                          : 'No high-fit matches yet'}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.utilityCard,
                      {
                        borderColor: tokens.colors.border,
                        backgroundColor:
                          resolvedTheme === 'light' ? '#E7DDF6' : 'rgba(31, 18, 50, 0.98)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        unratedAttendedCount > 0 ? styles.utilityValue : styles.utilityValueMuted,
                        { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans },
                      ]}
                    >
                      {unratedAttendedCount > 0 ? String(unratedAttendedCount) : 'None yet'}
                    </Text>
                    <Text
                      style={[
                        styles.kpiCardLabel,
                        { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans },
                      ]}
                    >
                      Ratings Follow-up
                    </Text>
                    <View style={styles.utilityViz}>
                      <View style={styles.ratingDots}>
                        {Array.from({ length: 4 }).map((_, index) => (
                          <View
                            key={index}
                            style={[
                              styles.ratingDot,
                              {
                                backgroundColor:
                                  index < unratedAttendedCount
                                    ? (resolvedTheme === 'light' ? '#6D28D9' : '#A78BFA')
                                    : tokens.colors.borderStrong,
                              },
                            ]}
                          />
                        ))}
                      </View>
                      <Text
                        style={[
                          styles.barLabel,
                          {
                            color: tokens.colors.textSecondary,
                            fontFamily: tokens.typography.sans,
                            textAlign: 'left',
                            marginTop: 6,
                          },
                        ]}
                      >
                        {unratedAttendedCount > 0
                          ? 'Rate to improve recommendations'
                          : 'Attend events to unlock ratings'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {attentionItems.length > 1 ? (
              <View
                style={[
                  styles.attentionCard,
                  {
                    backgroundColor: tokens.colors.surface,
                    borderColor: tokens.colors.borderStrong,
                  },
                ]}
              >
                <View style={styles.attentionHeader}>
                  <Text
                    style={[
                      styles.attentionTitle,
                      {
                        color: tokens.colors.textPrimary,
                        fontFamily: tokens.typography.sans,
                      },
                    ]}
                  >
                    Attention queue
                  </Text>
                  <Text
                    style={[
                      styles.attentionMeta,
                      {
                        color: tokens.colors.textSecondary,
                        fontFamily: tokens.typography.sans,
                      },
                    ]}
                  >
                    {secondaryAttentionCount} more
                  </Text>
                </View>

                <View style={styles.attentionList}>
                  {attentionItems.slice(1).map((item) => (
                    <View
                      key={item.id}
                      style={[
                        styles.attentionRow,
                        {
                          borderBottomColor: tokens.colors.divider,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.attentionDot,
                          {
                            backgroundColor:
                              item.tone === 'warning'
                                ? tokens.colors.warning
                                : tokens.colors.accent,
                          },
                        ]}
                      />
                      <View style={styles.attentionCopy}>
                        <Text
                          style={[
                            styles.attentionLabel,
                            {
                              color: tokens.colors.textPrimary,
                              fontFamily: tokens.typography.sans,
                            },
                          ]}
                        >
                          {item.label}
                        </Text>
                        <Text
                          style={[
                            styles.attentionBody,
                            {
                              color: tokens.colors.textSecondary,
                              fontFamily: tokens.typography.sans,
                            },
                          ]}
                        >
                          {item.body}
                        </Text>
                      </View>
                      <KureButton variant="secondary" onPress={item.onPress}>
                        {item.action}
                      </KureButton>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <DashboardUpcomingCommitmentsCard
              commitments={dashboard.upcomingCommitments ?? []}
              showOpenSlot={dashboard.showOpenCommitmentSlot}
              onOpenEvent={(eventId) =>
                router.push({
                  pathname: '/event/[id]',
                  params: { id: eventId },
                })
              }
            />

            {dashboard.networkPulse ? (
              <DashboardNetworkPulseCard
                networkPulse={dashboard.networkPulse}
                speakerMatches={speakerMatches}
                onOpenSpeaker={(speakerId) =>
                  router.push({
                    pathname: '/speaker/[id]',
                    params: { id: speakerId },
                  })
                }
              />
            ) : null}

            {dashboard.recommendations.length > 1 ? (
              <DashboardRecommendationsCarousel
                recommendations={dashboard.recommendations}
                onOpenEvent={(eventId) =>
                  router.push({
                    pathname: '/event/[id]',
                    params: { id: eventId },
                  })
                }
                onExploreMore={() => router.push('/discover')}
              />
            ) : null}

            {error ? (
              <InlineNotice
                tone="warning"
                title="Dashboard unavailable"
                description={error}
                action={
                  <KureButton
                    variant="secondary"
                    onPress={() => void loadSummary()}
                  >
                    Try again
                  </KureButton>
                }
              />
            ) : null}
          </View>
        ) : null}
      </View>
    </MobilePage>
  );
}

const styles = StyleSheet.create({
  pageContent: {
    alignItems: 'center',
    paddingTop: 18,
  },
  pageGlow: {
    position: 'absolute',
    top: -18,
    left: -20,
    right: -20,
    height: 260,
    borderRadius: 260,
  },
  canvas: {
    width: '100%',
    maxWidth: 430,
    gap: 16,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  stack: {
    gap: 16,
  },
  summaryHeader: {
    gap: 8,
  },
  summaryTopline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryCopy: {
    gap: 6,
  },
  summaryEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  summaryTitle: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -1,
    maxWidth: 320,
  },
  summaryBody: {
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 340,
  },
  summaryChip: {
    minHeight: 28,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  summaryChipText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  statusBoard: {
    gap: 10,
  },
  heroStatusCard: {
    borderRadius: 22,
    borderWidth: 1,
    gap: 10,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingVertical: 16,
    position: 'relative',
  },
  heroStatusPressed: {
    opacity: 0.96,
    transform: [{ scale: 0.996 }],
  },
  heroImageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroStatusTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroStatusBadge: {
    minHeight: 28,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  heroStatusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  heroStatusBadgeOnImage: {
    backgroundColor: 'rgba(9, 11, 14, 0.52)',
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  heroStatusCopy: {
    gap: 4,
  },
  heroStatusEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  heroStatusTitle: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
    letterSpacing: -0.9,
  },
  heroStatusMeta: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  heroStatusBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  heroStatusFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 6,
  },
  heroFooterArrow: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '700',
  },
  statusSideColumn: {
    gap: 10,
  },
  healthCard: {
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  healthValue: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  stepTrack: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 2,
  },
  stepItem: {
    flex: 1,
    gap: 6,
  },
  stepCountSpacer: {
    height: 22,
  },
  stepSegment: {
    width: '100%',
    height: 14,
    borderRadius: 999,
  },
  stepLabelRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 1,
  },
  stepLabel: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  stepHelperText: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 1,
  },
  healthTrack: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
  },
  healthFill: {
    height: '100%',
    borderRadius: 999,
  },
  statusChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  kpiTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  kpiIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiIconText: {
    fontSize: 18,
  },
  kpiMetricBlock: {
    flex: 1,
    gap: 2,
  },
  utilityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  utilityCard: {
    flex: 1,
    minHeight: 140,
    borderRadius: 18,
    borderWidth: 1,
    gap: 6,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  utilityLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  utilityValue: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  utilityDetail: {
    fontSize: 12,
    lineHeight: 16,
  },
  utilityViz: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  kpiCardLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  barLabel: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
  ratingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 6,
  },
  ratingDot: {
    flex: 1,
    height: 12,
    borderRadius: 999,
  },
  attentionCard: {
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  attentionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  attentionTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
  },
  attentionMeta: {
    fontSize: 12,
    fontWeight: '700',
  },
  attentionList: {
    gap: 0,
  },
  attentionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  attentionDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  attentionCopy: {
    flex: 1,
    gap: 2,
  },
  attentionLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  attentionBody: {
    fontSize: 12,
    lineHeight: 16,
  },
  kpiHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreWithDenom: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  scoreDenom: {
    fontSize: 13,
    fontWeight: '600',
  },
  utilityValueMuted: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
