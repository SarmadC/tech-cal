import { StyleSheet, Text, View } from "react-native";

import { DashboardCard } from "./DashboardCard";
import { useAppTheme } from "../../providers/ThemeProvider";

const STEPS = ["Saved", "RSVP", "Attended"] as const;

export function DashboardFollowThroughCard({
  followThroughRate,
  funnelValues,
}: {
  followThroughRate: number;
  funnelValues: [number, number, number];
}) {
  const { tokens } = useAppTheme();
  const total = funnelValues[0] + funnelValues[1] + funnelValues[2];

  return (
    <DashboardCard contentStyle={{ paddingVertical: 16, gap: 6 }}>
      <View style={styles.headerRow}>
        <Text
          style={[
            styles.label,
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
            styles.value,
            {
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {total > 0 ? `${followThroughRate}%` : "0%"}
        </Text>
      </View>
      <View style={styles.stepTrack}>
        {STEPS.map((lbl, i) => (
          <View key={lbl} style={styles.stepItem}>
            <View style={styles.stepCountSpacer} />
            <View
              style={[
                styles.stepSegment,
                {
                  backgroundColor:
                    funnelValues[i] > 0
                      ? tokens.colors.accent
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
        {STEPS.map((lbl, i) => (
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
    </DashboardCard>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  value: {
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
    height: 64,
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
});
