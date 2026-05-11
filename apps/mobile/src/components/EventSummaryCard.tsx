import { Pressable, StyleSheet, Text, View } from "react-native";

import type { MobileEventSummary } from "@kurecal/domain";
import { useAppTheme } from "../providers/ThemeProvider";

interface EventSummaryCardProps {
  event: MobileEventSummary;
  onPress?: () => void;
  tone?: "default" | "highlight";
}

function formatFallbackTime(startTime: string, endTime?: string | null) {
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : null;

  const dateLabel = start.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const startLabel = start.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (!end) {
    return `${dateLabel} • ${startLabel}`;
  }

  const endLabel = end.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${dateLabel} • ${startLabel} - ${endLabel}`;
}

function EventContent({
  event,
  tone,
}: {
  event: MobileEventSummary;
  tone: "default" | "highlight";
}) {
  const { tokens } = useAppTheme();
  const badges = [
    ...(event.formatLabel ? [event.formatLabel] : []),
    ...(event.priceLabel ? [event.priceLabel] : []),
    ...(event.engagement?.isBookmarked ? ["Saved"] : []),
    ...(event.engagement?.status
      ? [
          event.engagement.status === "attending"
            ? "Attending"
            : event.engagement.status,
        ]
      : []),
  ];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.md,
        },
        tone === "highlight" ? styles.cardHighlight : null,
      ]}
    >
      <Text
        style={[
          styles.timeLabel,
          { color: tokens.colors.accent, fontFamily: tokens.typography.sans },
        ]}
      >
        {event.timeLabel ?? formatFallbackTime(event.startTime, event.endTime)}
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
        {event.title}
      </Text>
      {event.description ? (
        <Text
          numberOfLines={2}
          style={[
            styles.description,
            {
              color: tokens.colors.textTertiary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {event.description}
        </Text>
      ) : null}
      <View style={styles.meta}>
        {event.organizerName ? (
          <Text
            style={[
              styles.metaText,
              {
                color: tokens.colors.textSecondary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {event.organizerName}
          </Text>
        ) : null}
        {event.location ? (
          <Text
            style={[
              styles.metaText,
              {
                color: tokens.colors.textSecondary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {event.location}
          </Text>
        ) : null}
      </View>
      {badges.length > 0 ? (
        <View style={styles.badges}>
          {badges.map((badge) => (
            <View
              key={badge}
              style={[
                styles.badge,
                {
                  backgroundColor: tokens.colors.surfaceMuted,
                  borderColor: tokens.colors.border,
                  borderRadius: tokens.radius.xs,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeLabel,
                  {
                    color: tokens.colors.textSecondary,
                    fontFamily: tokens.typography.sans,
                  },
                ]}
              >
                {badge}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function EventSummaryCard({
  event,
  onPress,
  tone = "default",
}: EventSummaryCardProps) {
  const { tokens } = useAppTheme();

  if (!onPress) {
    return <EventContent event={event} tone={tone} />;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pressable,
        { borderRadius: tokens.radius.md },
        pressed ? styles.pressablePressed : null,
      ]}
    >
      <EventContent event={event} tone={tone} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  card: {
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  cardHighlight: {
    borderColor: "rgba(189, 194, 255, 0.32)",
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  meta: {
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: "500",
  },
  pressable: {},
  pressablePressed: {
    opacity: 0.92,
    transform: [{ scale: 0.992 }],
  },
  timeLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.66,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 20,
  },
});
