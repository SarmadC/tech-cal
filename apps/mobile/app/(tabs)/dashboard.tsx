import { useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type {
  MobileCommunityNetworkingSpeakerMatch,
  MobileNetworkingContactReference,
  MobileDashboardSummary,
} from "@kurecal/domain";

import { MobilePage } from "../../src/components/chrome/MobilePage";
import { InlineNotice } from "../../src/components/chrome/InlineNotice";
import { KureButton } from "../../src/components/chrome/KureButton";
import { DashboardNetworkPulseCard } from "../../src/components/dashboard/DashboardNetworkPulseCard";
import { ScreenState } from "../../src/components/chrome/ScreenState";
import { TabMenuOverlay } from "../../src/components/chrome/TabMenuOverlay";
import { DashboardRecommendationsCarousel } from "../../src/components/dashboard/DashboardRecommendationsCarousel";
import { EventImageSurface } from "../../src/components/shared/EventImageSurface";
import {
  loadMobileCommunityHome,
  loadMobileDashboardSummary,
} from "../../src/lib/mobileApi";
import { useAppTheme } from "../../src/providers/ThemeProvider";

type DashboardAttentionItem = {
  id: string;
  tone: "warning" | "info";
  label: string;
  body: string;
  action: string;
  onPress: () => void;
};

function formatHeroMeta(
  startTime?: string,
  location?: string | null,
  daysUntil?: number,
) {
  if (!startTime) {
    return null;
  }

  const start = new Date(startTime);
  const dateLabel = start.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const parts = [dateLabel];
  if (location?.trim()) {
    parts.push(location.trim());
  }
  if (typeof daysUntil === "number") {
    parts.push(daysUntil === 0 ? "Today" : `${daysUntil} days away`);
  }

  return parts.join(" • ");
}

export default function DashboardScreen() {
  const { tokens } = useAppTheme();
  const insets = useSafeAreaInsets();
  const hasLoadedRef = useRef(false);
  const [data, setData] = useState<MobileDashboardSummary | null>(null);
  const [speakerMatches, setSpeakerMatches] = useState<
    MobileCommunityNetworkingSpeakerMatch[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSummary = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "initial") {
        setLoading(true);
      }

      try {
        const [summaryResult, communityResult] = await Promise.allSettled([
          loadMobileDashboardSummary(),
          loadMobileCommunityHome(),
        ]);

        if (summaryResult.status !== "fulfilled") {
          throw summaryResult.reason;
        }

        const summary = summaryResult.value;
        const nextSpeakerMatches =
          communityResult.status === "fulfilled"
            ? (() => {
                const seen = new Set<string>();
                return (communityResult.value.speakerMatches ?? []).filter(
                  (match) => {
                    const key = match.speaker.id || match.speaker.name;
                    if (seen.has(key)) {
                      return false;
                    }

                    seen.add(key);
                    return true;
                  },
                );
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
            : "Unable to load dashboard",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      const mode = hasLoadedRef.current ? "refresh" : "initial";
      hasLoadedRef.current = true;
      void loadSummary(mode);
    }, [loadSummary]),
  );

  const dashboard = data;
  const topRecommendation = dashboard?.topRecommendation ?? null;
  const recommendationScore =
    typeof topRecommendation?.event.score === "number"
      ? Math.round(topRecommendation.event.score)
      : null;
  const pipelineScore =
    dashboard?.insights?.pipeline.avgScore &&
    dashboard.insights.pipeline.avgScore > 0
      ? dashboard.insights.pipeline.avgScore
      : (recommendationScore ?? 0);
  const highFitCount =
    dashboard?.insights?.pipeline.highFitCount &&
    dashboard.insights.pipeline.highFitCount > 0
      ? dashboard.insights.pipeline.highFitCount
      : pipelineScore >= 60
        ? 1
        : 0;
  const nextCommitment = dashboard?.upcomingCommitments?.[0] ?? null;
  const followThroughTotal = dashboard
    ? (dashboard.insights?.funnel.savedOnly ?? 0) +
      (dashboard.insights?.funnel.rsvped ?? 0) +
      (dashboard.insights?.funnel.attended ?? 0)
    : 0;
  const followThroughRate =
    dashboard && followThroughTotal > 0
      ? Math.round(
          ((dashboard.insights?.funnel.attended ?? 0) / followThroughTotal) *
            100,
        )
      : 0;
  const unratedAttendedCount =
    dashboard?.careerOutcomes?.unratedAttendedCount ?? 0;
  const nextNetworkingContact =
    dashboard?.networkPulse?.nextContactToConfirm ?? null;
  const openNetworkingContact = useCallback(
    (contact: MobileNetworkingContactReference) => {
      if (contact.kind === "speaker") {
        router.push({
          pathname: "/speaker/[id]",
          params: {
            id: contact.id,
            ...(contact.sourceEvent?.id
              ? { eventId: contact.sourceEvent.id }
              : {}),
            ...(contact.sourceEvent?.title
              ? { eventTitle: contact.sourceEvent.title }
              : {}),
          },
        });
        return;
      }

      if (contact.username) {
        router.push({
          pathname: "/profile/[username]",
          params: { username: contact.username },
        });
      }
    },
    [],
  );

  const attentionItems: DashboardAttentionItem[] = dashboard
    ? [
        !dashboard.onboardingState.hasCompleted
          ? {
              id: "onboarding",
              tone: "warning" as const,
              label: "Profile incomplete",
              body: "Finish onboarding to improve ranking and planning quality.",
              action: dashboard.onboardingState.ctaLabel ?? "Resume onboarding",
              onPress: () =>
                router.push({
                  pathname: "/onboarding",
                  params: { resume: "1" },
                }),
            }
          : null,
        nextCommitment
          ? {
              id: "prep",
              tone: "info" as const,
              label: nextCommitment.event.title,
              body:
                nextCommitment.daysUntil === 0
                  ? "Happening today"
                  : `Coming up in ${nextCommitment.daysUntil} day${nextCommitment.daysUntil === 1 ? "" : "s"}`,
              action: "Open event",
              onPress: () =>
                router.push({
                  pathname: "/event/[id]",
                  params: { id: nextCommitment.event.id },
                }),
            }
          : null,
        dashboard.careerOutcomes?.nextEventToRate
          ? {
              id: "feedback",
              tone: "warning" as const,
              label: "Feedback needed",
              body: dashboard.careerOutcomes.nextEventToRate.title,
              action: "Open event",
              onPress: () =>
                router.push({
                  pathname: "/event/[id]",
                  params: {
                    id: dashboard.careerOutcomes?.nextEventToRate?.id ?? "",
                  },
                }),
            }
          : null,
        nextNetworkingContact &&
        (nextNetworkingContact.kind === "speaker" ||
          Boolean(nextNetworkingContact.username))
          ? {
              id: "connections-follow-up",
              tone: "info" as const,
              label: "Confirm connection",
              body: nextNetworkingContact.sourceEvent?.title
                ? `${nextNetworkingContact.name} · ${nextNetworkingContact.sourceEvent.title}`
                : nextNetworkingContact.name,
              action: "Open contact",
              onPress: () => openNetworkingContact(nextNetworkingContact),
            }
          : null,
      ].filter((item): item is DashboardAttentionItem => item !== null)
    : [];
  const primaryAttention = attentionItems[0] ?? null;
  const secondaryAttentionCount = Math.max(0, attentionItems.length - 1);
  const pipelineStatus =
    pipelineScore >= 67 ? "Strong" : pipelineScore >= 33 ? "Fair" : "Low";
  const pipelineStatusColor =
    pipelineScore >= 67
      ? tokens.colors.accent
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
  const heroEyebrow = topRecommendation
    ? null
    : primaryAttention
      ? "Needs attention"
      : "Next move";
  const heroTitle = topRecommendation
    ? topRecommendation.event.title
    : primaryAttention
      ? primaryAttention.label
      : "Nothing urgent. Your next strong-fit event is one tap away.";
  const heroMeta = topRecommendation
    ? formatHeroMeta(
        topRecommendation.event.startTime,
        topRecommendation.event.location,
        topRecommendation.daysUntil,
      )
    : null;
  const heroBadgeLabel = topRecommendation
    ? recommendationScore != null
      ? `${recommendationScore}% Match`
      : (topRecommendation.impactLabel ?? "Strong fit")
    : null;
  const heroBody = topRecommendation
    ? null
    : primaryAttention
      ? primaryAttention.body
      : (dashboard?.monthlyPulse?.deltaLabel ??
        "Stay in motion by checking the latest relevant events in Discover.");
  const heroCtaPress = topRecommendation
    ? () =>
        router.push({
          pathname: "/event/[id]",
          params: { id: topRecommendation.event.id },
        })
    : primaryAttention
      ? primaryAttention.onPress
      : () => router.push("/discover");

  return (
    <MobilePage
      title="Dashboard"
      headerHidden
      showAccentGlow={false}
      contentStyle={[styles.pageContent, { paddingTop: insets.top + 52 }]}
    >
      <TabMenuOverlay />
      <View style={styles.canvas}>

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
              <KureButton
                variant="secondary"
                onPress={() => void loadSummary()}
              >
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
                      borderColor: tokens.colors.border,
                    },
                  ]}
                  pressedStyle={styles.heroStatusPressed}
                >
                  <View
                    style={[
                      styles.heroImageOverlay,
                      {
                        backgroundColor: tokens.colors.overlay,
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
                              color: tokens.colors.textPrimary,
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
                          color: tokens.colors.textPrimary,
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
                            color: tokens.colors.textSecondary,
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
                            color: tokens.colors.textSecondary,
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
                          color: tokens.colors.textPrimary,
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
                        ? tokens.colors.borderStrong
                        : tokens.colors.borderStrong,
                      backgroundColor: tokens.colors.surface,
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
                      backgroundColor: tokens.colors.surface,
                    },
                  ]}
                >
                  <View style={styles.kpiHeaderRow}>
                    <Text
                      style={[
                        styles.kpiCardLabel,
                        {
                          color: tokens.colors.textPrimary,
                          fontFamily: tokens.typography.sans,
                        },
                      ]}
                    >
                      Follow-through
                    </Text>
                    <Text
                      style={[
                        styles.healthValue,
                        {
                          color: tokens.colors.textPrimary,
                          fontFamily: tokens.typography.sans,
                        },
                      ]}
                    >
                      {followThroughTotal > 0 ? `${followThroughRate}%` : "0%"}
                    </Text>
                  </View>
                  <View style={styles.stepTrack}>
                    {(["Saved", "RSVP", "Attended"] as const).map((lbl, i) => (
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
                    {(["Saved", "RSVP", "Attended"] as const).map((lbl, i) => (
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
                      ? "RSVP pending attendance"
                      : "No pending follow-up"}
                  </Text>
                </View>

                <View style={styles.utilityRow}>
                  <View
                    style={[
                      styles.utilityCard,
                      {
                        borderColor: tokens.colors.border,
                        backgroundColor: tokens.colors.surface,
                      },
                    ]}
                  >
                    <View style={styles.kpiHeaderRow}>
                      {pipelineScore > 0 ? (
                        <View style={styles.scoreWithDenom}>
                          <Text
                            style={[
                              styles.utilityValue,
                              {
                                color: tokens.colors.textPrimary,
                                fontFamily: tokens.typography.sans,
                              },
                            ]}
                          >
                            {pipelineScore}
                          </Text>
                          <Text
                            style={[
                              styles.scoreDenom,
                              {
                                color: tokens.colors.textTertiary,
                                fontFamily: tokens.typography.sans,
                              },
                            ]}
                          >
                            /100
                          </Text>
                        </View>
                      ) : (
                        <Text
                          style={[
                            styles.utilityValueMuted,
                            {
                              color: tokens.colors.textPrimary,
                              fontFamily: tokens.typography.sans,
                            },
                          ]}
                        >
                          Pipeline score
                        </Text>
                      )}
                      {pipelineScore > 0 ? (
                        <View
                          style={[
                            styles.statusChip,
                            { borderColor: pipelineStatusColor },
                          ]}
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
                        {
                          color: tokens.colors.textSecondary,
                          fontFamily: tokens.typography.sans,
                        },
                      ]}
                    >
                      {pipelineScore > 0 ? "Top picks fit" : "No score yet"}
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
                            textAlign: "left",
                            marginTop: 6,
                          },
                        ]}
                      >
                        {highFitCount > 0
                          ? `${highFitCount} high-fit top pick${highFitCount === 1 ? "" : "s"}`
                          : "No high-fit top picks yet"}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.utilityCard,
                      {
                        borderColor: tokens.colors.border,
                        backgroundColor: tokens.colors.surface,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        unratedAttendedCount > 0
                          ? styles.utilityValue
                          : styles.utilityValueMuted,
                        {
                          color: tokens.colors.textPrimary,
                          fontFamily: tokens.typography.sans,
                        },
                      ]}
                    >
                      {unratedAttendedCount > 0
                        ? String(unratedAttendedCount)
                        : "Ratings follow-up"}
                    </Text>
                    <Text
                      style={[
                        styles.kpiCardLabel,
                        {
                          color: tokens.colors.textSecondary,
                          fontFamily: tokens.typography.sans,
                        },
                      ]}
                    >
                      {unratedAttendedCount > 0
                        ? "Ratings follow-up"
                        : "No ratings to follow up"}
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
                                    ? tokens.colors.accent
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
                            textAlign: "left",
                            marginTop: 6,
                          },
                        ]}
                      >
                        {unratedAttendedCount > 0
                          ? "Rate to improve recommendations"
                          : "Attend events to unlock ratings"}
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
                              item.tone === "warning"
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

            {dashboard.networkPulse ? (
              <DashboardNetworkPulseCard
                networkPulse={dashboard.networkPulse}
                attendedEventCount={
                  dashboard.careerOutcomes?.attendedCount ??
                  dashboard.insights?.funnel.attended ??
                  0
                }
                speakerMatches={speakerMatches}
                onOpenRecommendedSpeakers={() =>
                  router.push("/dashboard/recommended-speakers")
                }
                onOpenPendingContact={
                  nextNetworkingContact &&
                  (nextNetworkingContact.kind === "speaker" ||
                    Boolean(nextNetworkingContact.username))
                    ? () => openNetworkingContact(nextNetworkingContact)
                    : undefined
                }
              />
            ) : null}

            {dashboard.recommendations.length > 1 ? (
              <DashboardRecommendationsCarousel
                recommendations={dashboard.recommendations}
                onOpenEvent={(eventId) =>
                  router.push({
                    pathname: "/event/[id]",
                    params: { id: eventId },
                  })
                }
                onExploreMore={() => router.push("/discover")}
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
    alignItems: "center",
  },
  canvas: {
    width: "100%",
    maxWidth: 430,
    gap: 10,
  },
  stack: {
    gap: 10,
  },
  summaryHeader: {
    gap: 5,
  },
  summaryTopline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  summaryCopy: {
    gap: 3,
  },
  summaryEyebrow: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.66,
    textTransform: "uppercase",
  },
  summaryTitle: {
    fontSize: 24,
    lineHeight: 29,
    fontWeight: "700",
    letterSpacing: -0.24,
    maxWidth: 320,
  },
  summaryBody: {
    fontSize: 13,
    lineHeight: 18,
    maxWidth: 340,
  },
  summaryChip: {
    minHeight: 24,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  summaryChipText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  statusBoard: {
    gap: 10,
  },
  heroStatusCard: {
    borderRadius: 6,
    borderWidth: 1,
    gap: 8,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 12,
    position: "relative",
  },
  heroStatusPressed: {
    opacity: 0.96,
    transform: [{ scale: 0.996 }],
  },
  heroImageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroStatusTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  heroStatusBadge: {
    minHeight: 24,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  heroStatusBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  heroStatusBadgeOnImage: {
    backgroundColor: "transparent",
  },
  heroStatusCopy: {
    gap: 4,
  },
  heroStatusEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  heroStatusTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "700",
    letterSpacing: -0.24,
  },
  heroStatusMeta: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  heroStatusBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  heroStatusFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 6,
  },
  heroFooterArrow: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: "700",
  },
  statusSideColumn: {
    gap: 10,
  },
  healthCard: {
    borderRadius: 6,
    borderWidth: 1,
    gap: 6,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  healthValue: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  stepTrack: {
    flexDirection: "row",
    alignItems: "flex-end",
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
    width: "100%",
    height: 14,
    borderRadius: 2,
  },
  stepLabelRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 1,
  },
  stepLabel: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  stepHelperText: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 1,
  },
  healthTrack: {
    height: 10,
    borderRadius: 2,
    overflow: "hidden",
  },
  healthFill: {
    height: "100%",
    borderRadius: 2,
  },
  statusChip: {
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  kpiTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  kpiIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  kpiIconText: {
    fontSize: 18,
  },
  kpiMetricBlock: {
    flex: 1,
    gap: 2,
  },
  utilityRow: {
    flexDirection: "row",
    gap: 10,
  },
  utilityCard: {
    flex: 1,
    minHeight: 140,
    borderRadius: 6,
    borderWidth: 1,
    gap: 6,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  utilityLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  utilityValue: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "700",
    letterSpacing: -0.6,
  },
  utilityDetail: {
    fontSize: 12,
    lineHeight: 16,
  },
  utilityViz: {
    flex: 1,
    justifyContent: "flex-end",
  },
  kpiCardLabel: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  barLabel: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "600",
  },
  ratingDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 6,
  },
  ratingDot: {
    flex: 1,
    height: 12,
    borderRadius: 2,
  },
  attentionCard: {
    borderRadius: 6,
    borderWidth: 1,
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  attentionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  attentionTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
  },
  attentionMeta: {
    fontSize: 12,
    fontWeight: "700",
  },
  attentionList: {
    gap: 0,
  },
  attentionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  attentionDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  attentionCopy: {
    flex: 1,
    gap: 2,
  },
  attentionLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
  },
  attentionBody: {
    fontSize: 12,
    lineHeight: 16,
  },
  kpiHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scoreWithDenom: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  scoreDenom: {
    fontSize: 13,
    fontWeight: "600",
  },
  utilityValueMuted: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
});
