import { useCallback, useRef, useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
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
import { DashboardFollowThroughCard } from "../../src/components/dashboard/DashboardFollowThroughCard";
import { DashboardHeroCard } from "../../src/components/dashboard/DashboardHeroCard";
import { DashboardNetworkPulseCard } from "../../src/components/dashboard/DashboardNetworkPulseCard";
import { ScreenState } from "../../src/components/chrome/ScreenState";
import { TabMenuOverlay } from "../../src/components/chrome/TabMenuOverlay";
import { DashboardRecommendationsCarousel } from "../../src/components/dashboard/DashboardRecommendationsCarousel";
import {
  loadMobileCommunityHome,
  loadMobileDashboardSummary,
} from "../../src/lib/mobileApi";
import { useAppTheme } from "../../src/providers/ThemeProvider";
import { RECOMMENDATION_THRESHOLDS } from "../../../../src/config/recommendationThresholds";
import { useAuth } from "../../src/context/AuthProvider";
import { readMobileSnapshot, writeMobileSnapshot } from "../../src/lib/mobileSnapshotCache";

type DashboardAttentionItem = {
  id: string;
  tone: "warning" | "info";
  label: string;
  body: string;
  action: string;
  onPress: () => void;
};

export default function DashboardScreen() {
  const { tokens } = useAppTheme();
  const { profile } = useAuth();
  const { fontScale } = useWindowDimensions();
  const usesAccessibilityLayout = fontScale >= 1.6;
  const insets = useSafeAreaInsets();
  const hasLoadedRef = useRef(false);
  const [data, setData] = useState<MobileDashboardSummary | null>(null);
  const [speakerMatches, setSpeakerMatches] = useState<
    MobileCommunityNetworkingSpeakerMatch[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [headerControlsVisible, setHeaderControlsVisible] = useState(true);

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
        void writeMobileSnapshot(
          profile?.profile.id ?? "signed-out",
          "dashboard",
          { summary, speakerMatches: nextSpeakerMatches },
        );
      } catch (nextError) {
        const cached = await readMobileSnapshot<{
          summary: MobileDashboardSummary;
          speakerMatches: MobileCommunityNetworkingSpeakerMatch[];
        }>(profile?.profile.id ?? "signed-out", "dashboard");
        if (cached) {
          setData(cached.value.summary);
          setSpeakerMatches(cached.value.speakerMatches);
          setError("Showing your last saved dashboard. Pull to refresh when connected.");
        } else {
          setSpeakerMatches([]);
          setError(
            nextError instanceof Error
              ? nextError.message
              : "Unable to load dashboard",
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [profile?.profile.id],
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
      : pipelineScore >= RECOMMENDATION_THRESHOLDS.RECOMMENDED
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
  const pipelineStatusColor =
    pipelineScore >= RECOMMENDATION_THRESHOLDS.BUCKETS.HIGH
      ? tokens.colors.accent
      : pipelineScore >= RECOMMENDATION_THRESHOLDS.BUCKETS.MODERATE
        ? tokens.colors.accent
        : tokens.colors.warning;
  const funnelValues: [number, number, number] = dashboard?.insights?.funnel
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
    <>
    <MobilePage
      title="Dashboard"
      headerHidden
      showAccentGlow={false}
      contentStyle={[styles.pageContent, { paddingTop: insets.top + 52 }]}
      onControlsVisibilityChange={setHeaderControlsVisible}
    >
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
              <DashboardHeroCard
                event={topRecommendation?.event ?? null}
                daysUntil={topRecommendation?.daysUntil}
                eyebrow={heroEyebrow}
                title={heroTitle}
                body={heroBody}
                onPress={heroCtaPress}
              />

              <View style={styles.statusSideColumn}>
                <DashboardFollowThroughCard
                  followThroughRate={followThroughRate}
                  funnelValues={funnelValues}
                />

                <View style={[styles.utilityRow, usesAccessibilityLayout && styles.utilityColumn]}>
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
                      <Text
                        style={[
                          styles.kpiCardLabel,
                          {
                            color: tokens.colors.textPrimary,
                            fontFamily: tokens.typography.sans,
                          },
                        ]}
                      >
                        Top picks fit
                      </Text>
                      {pipelineScore > 0 ? (
                        <View style={styles.scoreWithDenom}>
                          <Text
                            style={[
                              styles.healthValue,
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
                      ) : null}
                    </View>
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
                          : styles.kpiCardLabel,
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
    {(!loading || !!data) && headerControlsVisible && <TabMenuOverlay />}
    </>
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
  statusSideColumn: {
    gap: 10,
  },
  healthValue: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "700",
    letterSpacing: -0.4,
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
  utilityColumn: {
    flexDirection: "column",
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
