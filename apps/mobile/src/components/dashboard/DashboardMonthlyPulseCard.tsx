import { StyleSheet, Text, View } from "react-native";

import type { MobileDashboardMonthlyPulse } from "@kurecal/domain";

import { DashboardCard } from "./DashboardCard";
import { useAppTheme } from "../../providers/ThemeProvider";

export function DashboardMonthlyPulseCard({
  pulse,
}: {
  pulse: MobileDashboardMonthlyPulse;
}) {
  const { tokens } = useAppTheme();
  const trendMax = Math.max(...pulse.trend.map((item) => item.value), 0);

  return (
    <DashboardCard>
      <View style={styles.header}>
        <Text
          style={{
            color: tokens.colors.textSecondary,
            fontFamily: tokens.typography.sans,
            fontSize: 12,
            fontWeight: "700",
          }}
        >
          Monthly Pulse
        </Text>
        <View
          style={[
            styles.deltaPill,
            {
              backgroundColor: tokens.colors.surfaceMuted,
              borderColor: tokens.colors.border,
            },
          ]}
        >
          <Text
            style={{
              color: tokens.colors.textSecondary,
              fontFamily: tokens.typography.sans,
              fontSize: 10,
              fontWeight: "700",
            }}
          >
            {pulse.deltaLabel}
          </Text>
        </View>
      </View>

      <Text
        style={{
          color: tokens.colors.textPrimary,
          fontFamily: tokens.typography.sans,
          fontSize: 36,
          fontWeight: "800",
          letterSpacing: -1,
        }}
      >
        {pulse.currentCount}
      </Text>
      <Text
        style={{
          color: tokens.colors.textSecondary,
          fontFamily: tokens.typography.sans,
          fontSize: 13,
          fontWeight: "500",
        }}
      >
        events attended in the last 30 days
      </Text>

      <View style={styles.trendArea}>
        {trendMax === 0 ? (
          <View
            style={[
              styles.emptyState,
              {
                borderColor: tokens.colors.borderStrong,
                backgroundColor: tokens.colors.surfaceMuted,
              },
            ]}
          >
            <Text
              style={{
                color: tokens.colors.textSecondary,
                fontFamily: tokens.typography.sans,
                fontSize: 12,
                fontWeight: "600",
              }}
            >
              No attendance activity in the last 30 days
            </Text>
          </View>
        ) : (
          <View style={styles.trendGrid}>
            {pulse.trend.map((item) => {
              const height = Math.max(
                10,
                Math.round((item.value / trendMax) * 44),
              );
              return (
                <View key={item.label} style={styles.trendColumn}>
                  <View style={styles.trendBarWrap}>
                    <View
                      style={[
                        styles.trendBar,
                        {
                          height,
                          backgroundColor: tokens.colors.accent,
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={{
                      color: tokens.colors.textPrimary,
                      fontFamily: tokens.typography.sans,
                      fontSize: 11,
                      fontWeight: "700",
                    }}
                  >
                    {item.value}
                  </Text>
                  <Text
                    style={{
                      color: tokens.colors.textSecondary,
                      fontFamily: tokens.typography.sans,
                      fontSize: 10,
                      fontWeight: "600",
                    }}
                  >
                    {item.label}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </DashboardCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  deltaPill: {
    minHeight: 26,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  trendArea: {
    marginTop: 4,
  },
  emptyState: {
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: "dashed",
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  trendGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  trendColumn: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  trendBarWrap: {
    height: 52,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  trendBar: {
    width: 12,
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
  },
});
