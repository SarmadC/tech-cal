import { FontAwesome5 } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { MobileDashboardTopRecommendation } from "@kurecal/domain";

import { useAppTheme } from "../../providers/ThemeProvider";

function formatEventMeta(
  startTime: string,
  location?: string | null,
  daysUntil?: number,
) {
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

export function DashboardRecommendationHero({
  recommendation,
  onPress,
}: {
  recommendation: MobileDashboardTopRecommendation;
  onPress?: () => void;
}) {
  const { tokens } = useAppTheme();
  const event = recommendation.event;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pressable,
        {
          borderRadius: tokens.radius.md,
          borderColor: tokens.colors.border,
          backgroundColor: tokens.colors.surface,
        },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.content}>
        <View style={styles.eyebrowRow}>
          <View
            style={[
              styles.eyebrowPill,
              {
                backgroundColor: tokens.colors.accentSoft,
                borderColor: tokens.colors.border,
              },
            ]}
          >
            <FontAwesome5
              name="sparkles"
              size={11}
              color={tokens.colors.accent}
            />
            <Text
              style={{
                color: tokens.colors.accent,
                fontFamily: tokens.typography.sans,
                fontSize: 11,
                fontWeight: "700",
              }}
            >
              Recommended
            </Text>
          </View>

          {recommendation.impactLabel ? (
            <View
              style={[
                styles.impactBadge,
                {
                  backgroundColor: tokens.colors.surfaceMuted,
                  borderColor: tokens.colors.border,
                },
              ]}
            >
              <Text
                style={{
                  color: tokens.colors.accent,
                  fontFamily: tokens.typography.sans,
                  fontSize: 10,
                  fontWeight: "800",
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                }}
              >
                {recommendation.impactLabel}
              </Text>
            </View>
          ) : null}
        </View>

        <Text
          style={{
            color: tokens.colors.textPrimary,
            fontFamily: tokens.typography.sans,
            fontSize: 22,
            lineHeight: 26,
            fontWeight: "700",
            letterSpacing: -0.3,
          }}
        >
          {event.title}
        </Text>

        <Text
          style={{
            color: tokens.colors.textSecondary,
            fontFamily: tokens.typography.sans,
            fontSize: 12,
            lineHeight: 16,
          }}
        >
          {formatEventMeta(
            event.startTime,
            event.location,
            recommendation.daysUntil,
          )}
        </Text>

        <Text
          style={{
            color: tokens.colors.textSecondary,
            fontFamily: tokens.typography.sans,
            fontSize: 13,
            lineHeight: 18,
          }}
          numberOfLines={3}
        >
          {recommendation.reason ||
            event.description ||
            "A strong next move from your current event pipeline."}
        </Text>

        <View style={styles.footer}>
          <Text
            style={{
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
              fontSize: 15,
              fontWeight: "700",
            }}
          >
            View event
          </Text>
          <FontAwesome5
            name="arrow-right"
            size={14}
            color={tokens.colors.textPrimary}
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderWidth: 1,
    overflow: "hidden",
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.994 }],
  },
  content: {
    gap: 8,
    padding: 12,
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  eyebrowPill: {
    minHeight: 24,
    borderRadius: 4,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
  },
  impactBadge: {
    minHeight: 24,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
});
