import { FontAwesome5 } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { MobileDashboardCareerOutcomes } from "@kurecal/domain";

import { DashboardCard } from "./DashboardCard";
import { useAppTheme } from "../../providers/ThemeProvider";

function formatPercent(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  return `${Math.round(value)}%`;
}

function formatRating(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  return value.toFixed(1);
}

export function DashboardCareerOutcomesCard({
  careerOutcomes,
  onOpenEvent,
}: {
  careerOutcomes: MobileDashboardCareerOutcomes;
  onOpenEvent?: (eventId: string) => void;
}) {
  const { tokens } = useAppTheme();

  if (careerOutcomes.state === "empty") {
    return (
      <DashboardCard>
        <View style={styles.emptyState}>
          <View
            style={[
              styles.emptyIcon,
              {
                backgroundColor: tokens.colors.surfaceMuted,
                borderColor: tokens.colors.borderStrong,
              },
            ]}
          >
            <FontAwesome5
              name="rocket"
              size={18}
              color={tokens.colors.textSecondary}
            />
          </View>
          <Text
            style={[
              styles.emptyTitle,
              {
                color: tokens.colors.textPrimary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            Start your journey
          </Text>
          <Text
            style={[
              styles.emptyBody,
              {
                color: tokens.colors.textSecondary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            Track and attend a few events to unlock outcome signals around
            ratings, skills, and network growth.
          </Text>
        </View>
      </DashboardCard>
    );
  }

  if (careerOutcomes.state === "early") {
    return (
      <DashboardCard>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text
              style={[
                styles.eyebrow,
                {
                  color: tokens.colors.textSecondary,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              Career Outcomes
            </Text>
            <Text
              style={[
                styles.title,
                {
                  color: tokens.colors.textPrimary,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              Keep rating events
            </Text>
          </View>
          <Text
            style={[
              styles.progressCounter,
              {
                color: tokens.colors.textTertiary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {careerOutcomes.feedbackCount}/5 rated
          </Text>
        </View>

        <View style={styles.progressRail}>
          {Array.from({ length: 5 }).map((_, index) => {
            const active = index < careerOutcomes.feedbackCount;
            const current = index === careerOutcomes.feedbackCount;
            return (
              <View
                key={index}
                style={[
                  styles.progressSegment,
                  {
                    backgroundColor: active
                      ? tokens.colors.textPrimary
                      : current
                        ? tokens.colors.accent
                        : tokens.colors.border,
                    flex: active || !current ? 1 : undefined,
                    width: current ? 30 : undefined,
                  },
                ]}
              />
            );
          })}
        </View>

        <View
          style={[
            styles.earlyPanel,
            {
              backgroundColor: tokens.colors.surfaceMuted,
              borderColor: tokens.colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.earlyTitle,
              {
                color: tokens.colors.textPrimary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {careerOutcomes.nextEventToRate
              ? careerOutcomes.nextEventToRate.title
              : "You are caught up"}
          </Text>
          <Text
            style={[
              styles.earlyBody,
              {
                color: tokens.colors.textSecondary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {careerOutcomes.nextEventToRate
              ? `${careerOutcomes.ratingsRemaining} more rating${
                  careerOutcomes.ratingsRemaining === 1 ? "" : "s"
                } unlocks the full outcomes view.`
              : "Attend another event to keep building your ratings history."}
          </Text>

          {careerOutcomes.nextEventToRate ? (
            <Pressable
              onPress={() => onOpenEvent?.(careerOutcomes.nextEventToRate!.id)}
              style={({ pressed }) => [
                styles.ctaButton,
                {
                  backgroundColor: tokens.colors.textPrimary,
                },
                pressed && styles.buttonPressed,
              ]}
            >
              <Text
                style={[
                  styles.ctaButtonText,
                  {
                    color: tokens.colors.textInverse,
                    fontFamily: tokens.typography.sans,
                  },
                ]}
              >
                Open event
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.earlyMetrics}>
          <View style={styles.earlyMetric}>
            <Text
              style={[
                styles.earlyMetricValue,
                {
                  color: tokens.colors.textPrimary,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              {careerOutcomes.unratedAttendedCount}
            </Text>
            <Text
              style={[
                styles.earlyMetricLabel,
                {
                  color: tokens.colors.textSecondary,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              unrated attended
            </Text>
          </View>
          <View
            style={[
              styles.earlyDivider,
              { backgroundColor: tokens.colors.divider },
            ]}
          />
          <View style={styles.earlyMetric}>
            <Text
              style={[
                styles.earlyMetricValue,
                {
                  color: tokens.colors.textPrimary,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              {careerOutcomes.attendedCount}
            </Text>
            <Text
              style={[
                styles.earlyMetricLabel,
                {
                  color: tokens.colors.textSecondary,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              events attended
            </Text>
          </View>
        </View>
      </DashboardCard>
    );
  }

  const matureMetrics = [
    {
      id: "rating",
      label: "Avg. rating",
      value: formatRating(careerOutcomes.averageRating),
    },
    {
      id: "recommend",
      label: "Recommend rate",
      value: formatPercent(careerOutcomes.recommendationRate),
    },
    {
      id: "connections",
      label: "Connections",
      value: String(careerOutcomes.totalConnectionsMade),
    },
    {
      id: "skills",
      label: "Skills gained",
      value: String(careerOutcomes.uniqueSkillsCount),
    },
  ];

  return (
    <DashboardCard>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text
            style={[
              styles.eyebrow,
              {
                color: tokens.colors.textSecondary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            Career Outcomes
          </Text>
          <Text
            style={[
              styles.title,
              {
                color: tokens.colors.textPrimary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            Outcome signals are live
          </Text>
        </View>
        <View
          style={[
            styles.matureBadge,
            {
              backgroundColor: tokens.colors.surfaceMuted,
              borderColor: tokens.colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.matureBadgeText,
              {
                color: tokens.colors.success,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            Mature
          </Text>
        </View>
      </View>

      <View style={styles.matureGrid}>
        {matureMetrics.map((metric) => (
          <View
            key={metric.id}
            style={[
              styles.matureMetric,
              {
                backgroundColor: tokens.colors.surfaceMuted,
                borderColor: tokens.colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.matureMetricValue,
                {
                  color: tokens.colors.textPrimary,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              {metric.value}
            </Text>
            <Text
              style={[
                styles.matureMetricLabel,
                {
                  color: tokens.colors.textSecondary,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              {metric.label}
            </Text>
          </View>
        ))}
      </View>

      {careerOutcomes.teaserMessage ? (
        <View
          style={[
            styles.matureNote,
            {
              backgroundColor: tokens.colors.accentSoft,
              borderColor: tokens.colors.border,
            },
          ]}
        >
          <FontAwesome5
            name="sparkles"
            size={12}
            color={tokens.colors.accent}
          />
          <Text
            style={[
              styles.matureNoteText,
              {
                color: tokens.colors.textPrimary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {careerOutcomes.teaserMessage}
          </Text>
        </View>
      ) : null}
    </DashboardCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "800",
    letterSpacing: -0.7,
  },
  progressCounter: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  progressRail: {
    flexDirection: "row",
    gap: 6,
  },
  progressSegment: {
    height: 3,
    borderRadius: 2,
  },
  earlyPanel: {
    borderRadius: 6,
    borderWidth: 1,
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  earlyTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "700",
  },
  earlyBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  ctaButton: {
    alignSelf: "flex-start",
    minHeight: 32,
    borderRadius: 4,
    justifyContent: "center",
    paddingHorizontal: 16,
    marginTop: 4,
  },
  ctaButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  buttonPressed: {
    opacity: 0.92,
  },
  earlyMetrics: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  earlyMetric: {
    flex: 1,
    gap: 4,
  },
  earlyMetricValue: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "800",
    letterSpacing: -0.7,
  },
  earlyMetricLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  earlyDivider: {
    width: 1,
    height: 32,
  },
  matureBadge: {
    minHeight: 24,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  matureBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  matureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  matureMetric: {
    width: "48%",
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  matureMetricValue: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  matureMetricLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
  matureNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  matureNoteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "800",
  },
  emptyBody: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
});
