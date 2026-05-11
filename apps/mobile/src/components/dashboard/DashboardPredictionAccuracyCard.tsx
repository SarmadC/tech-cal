import { StyleSheet, Text, View } from "react-native";

import type { MobileDashboardPredictionAccuracy } from "@kurecal/domain";

import { DashboardCard } from "./DashboardCard";
import { useAppTheme } from "../../providers/ThemeProvider";

function formatConfidence(
  value: MobileDashboardPredictionAccuracy["confidenceLabel"],
) {
  switch (value) {
    case "calibrated":
      return "Calibrated";
    case "learning":
      return "Learning";
    default:
      return "Not enough data";
  }
}

export function DashboardPredictionAccuracyCard({
  predictionAccuracy,
}: {
  predictionAccuracy: MobileDashboardPredictionAccuracy;
}) {
  const { tokens } = useAppTheme();
  const accuracy = predictionAccuracy.accuracy ?? 0;

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
            Prediction Accuracy
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
            Recommendation trust signal
          </Text>
        </View>

        <View
          style={[
            styles.confidenceChip,
            {
              backgroundColor:
                predictionAccuracy.confidenceLabel === "calibrated"
                  ? tokens.colors.surfaceMuted
                  : predictionAccuracy.confidenceLabel === "learning"
                    ? tokens.colors.accentSoft
                    : tokens.colors.surfaceMuted,
              borderColor:
                predictionAccuracy.confidenceLabel === "calibrated"
                  ? tokens.colors.border
                  : predictionAccuracy.confidenceLabel === "learning"
                    ? tokens.colors.border
                    : tokens.colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.confidenceText,
              {
                color:
                  predictionAccuracy.confidenceLabel === "calibrated"
                    ? tokens.colors.success
                    : predictionAccuracy.confidenceLabel === "learning"
                      ? tokens.colors.accent
                      : tokens.colors.warning,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {formatConfidence(predictionAccuracy.confidenceLabel)}
          </Text>
        </View>
      </View>

      <View style={styles.metricRow}>
        <Text
          style={[
            styles.accuracyValue,
            {
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {predictionAccuracy.accuracy == null
            ? "—"
            : `${Math.round(predictionAccuracy.accuracy)}%`}
        </Text>
        <Text
          style={[
            styles.sampleMeta,
            {
              color: tokens.colors.textSecondary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {predictionAccuracy.sampleSize} scored rating
          {predictionAccuracy.sampleSize === 1 ? "" : "s"}
        </Text>
      </View>

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
              width: `${Math.max(
                predictionAccuracy.accuracy == null ? 0 : 12,
                accuracy,
              )}%`,
              backgroundColor:
                predictionAccuracy.state === "ready"
                  ? tokens.colors.success
                  : tokens.colors.accent,
            },
          ]}
        />
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
        {predictionAccuracy.unlockMessage ??
          "Your model has enough feedback to start judging how often the ranking gets the call right."}
      </Text>
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
  confidenceChip: {
    minHeight: 24,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
  },
  accuracyValue: {
    fontSize: 40,
    lineHeight: 42,
    fontWeight: "800",
    letterSpacing: -1,
  },
  sampleMeta: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: "right",
  },
  barTrack: {
    height: 10,
    borderRadius: 2,
    borderWidth: 1,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 2,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
});
