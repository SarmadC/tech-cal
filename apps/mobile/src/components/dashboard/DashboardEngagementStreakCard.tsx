import { StyleSheet, Text, View } from "react-native";

import type { MobileDashboardEngagementStreak } from "@kurecal/domain";

import { DashboardCard } from "./DashboardCard";
import { useAppTheme } from "../../providers/ThemeProvider";

export function DashboardEngagementStreakCard({
  streak,
}: {
  streak: MobileDashboardEngagementStreak;
}) {
  const { tokens } = useAppTheme();

  return (
    <DashboardCard>
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text
            style={[
              styles.eyebrow,
              {
                color: tokens.colors.textSecondary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            Engagement Streak
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
            Weekly consistency
          </Text>
        </View>

        <View
          style={[
            styles.longestBadge,
            {
              backgroundColor: tokens.colors.accentSoft,
              borderColor: tokens.colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.longestText,
              {
                color: tokens.colors.warning,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            Best {streak.longestWeekStreak}
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.primaryMetric}>
          <Text
            style={[
              styles.primaryValue,
              {
                color: tokens.colors.textPrimary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {streak.currentWeekStreak}
          </Text>
          <Text
            style={[
              styles.primaryLabel,
              {
                color: tokens.colors.textSecondary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            consecutive weeks
          </Text>
        </View>

        <View style={styles.dotRow}>
          {streak.recentWeeks.map((week) => (
            <View
              key={week.weekKey}
              style={[
                styles.dot,
                {
                  backgroundColor: week.active
                    ? tokens.colors.success
                    : tokens.colors.surfaceMuted,
                  borderColor: week.active
                    ? tokens.colors.border
                    : tokens.colors.borderStrong,
                },
              ]}
            />
          ))}
        </View>
      </View>

      <Text
        style={[
          styles.message,
          {
            color: tokens.colors.textSecondary,
            fontFamily: tokens.typography.sans,
          },
        ]}
      >
        {streak.nudgeMessage}
      </Text>
    </DashboardCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  longestBadge: {
    minHeight: 24,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  longestText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  body: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  primaryMetric: {
    minWidth: 88,
    gap: 2,
  },
  primaryValue: {
    fontSize: 42,
    lineHeight: 44,
    fontWeight: "800",
    letterSpacing: -1.2,
  },
  primaryLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  dotRow: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  dot: {
    flex: 1,
    height: 14,
    borderRadius: 2,
    borderWidth: 1,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
});
