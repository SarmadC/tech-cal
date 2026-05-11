import { StyleSheet, Text, View } from "react-native";

import type { MobileDashboardDiscoveryBreadth } from "@kurecal/domain";

import { DashboardCard } from "./DashboardCard";
import { useAppTheme } from "../../providers/ThemeProvider";

function formatLabel(value: MobileDashboardDiscoveryBreadth["breadthLabel"]) {
  switch (value) {
    case "broad":
      return "Broad";
    case "balanced":
      return "Balanced";
    default:
      return "Narrow";
  }
}

export function DashboardDiscoveryBreadthCard({
  breadth,
}: {
  breadth: MobileDashboardDiscoveryBreadth;
}) {
  const { tokens } = useAppTheme();
  const maxFormat = Math.max(
    breadth.formatCounts.virtual,
    breadth.formatCounts["in-person"],
    breadth.formatCounts.hybrid,
    1,
  );
  const formatRows = [
    { id: "virtual", label: "Virtual", value: breadth.formatCounts.virtual },
    {
      id: "in-person",
      label: "In person",
      value: breadth.formatCounts["in-person"],
    },
    { id: "hybrid", label: "Hybrid", value: breadth.formatCounts.hybrid },
  ];

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
            Discovery Breadth
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
            Outside your usual lane
          </Text>
        </View>

        <View
          style={[
            styles.statusChip,
            {
              backgroundColor: tokens.colors.accentSoft,
              borderColor: tokens.colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color: tokens.colors.accent,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {formatLabel(breadth.breadthLabel)}
          </Text>
        </View>
      </View>

      <View style={styles.metricRow}>
        {[
          {
            id: "categories",
            value: breadth.categoryCount,
            label: "categories",
          },
          {
            id: "organizers",
            value: breadth.organizerCount,
            label: "organizers",
          },
          {
            id: "formats",
            value:
              Number(breadth.formatCounts.virtual > 0) +
              Number(breadth.formatCounts["in-person"] > 0) +
              Number(breadth.formatCounts.hybrid > 0),
            label: "formats",
          },
        ].map((item) => (
          <View
            key={item.id}
            style={[
              styles.metricCell,
              {
                backgroundColor: tokens.colors.surfaceMuted,
                borderColor: tokens.colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.metricValue,
                {
                  color: tokens.colors.textPrimary,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              {item.value}
            </Text>
            <Text
              style={[
                styles.metricLabel,
                {
                  color: tokens.colors.textSecondary,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              {item.label}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.barGroup}>
        {formatRows.map((item) => (
          <View key={item.id} style={styles.barRow}>
            <Text
              style={[
                styles.barLabel,
                {
                  color: tokens.colors.textSecondary,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              {item.label}
            </Text>
            <View
              style={[
                styles.barTrack,
                {
                  backgroundColor: tokens.colors.surfaceMuted,
                  borderColor: tokens.colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${Math.max(8, Math.round((item.value / maxFormat) * 100))}%`,
                    backgroundColor: tokens.colors.accent,
                  },
                ]}
              />
            </View>
            <Text
              style={[
                styles.barValue,
                {
                  color: tokens.colors.textPrimary,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              {item.value}
            </Text>
          </View>
        ))}
      </View>
    </DashboardCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    alignItems: "flex-start",
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
  statusChip: {
    minHeight: 24,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  metricRow: {
    flexDirection: "row",
    gap: 8,
  },
  metricCell: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  metricValue: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "800",
    letterSpacing: -0.7,
  },
  metricLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  barGroup: {
    gap: 10,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  barLabel: {
    width: 60,
    fontSize: 12,
    fontWeight: "600",
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 2,
    borderWidth: 1,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 2,
  },
  barValue: {
    width: 18,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
  },
});
