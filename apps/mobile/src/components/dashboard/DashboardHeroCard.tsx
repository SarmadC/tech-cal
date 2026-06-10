import { Pressable, StyleSheet, Text, View } from "react-native";

import type { MobileEventCard } from "@kurecal/domain";

import { EventImageSurface } from "../shared/EventImageSurface";
import { useAppTheme } from "../../providers/ThemeProvider";
import { formatEventMeta } from "../../utils/eventMeta";

interface DashboardHeroCardProps {
  event: MobileEventCard | null;
  daysUntil?: number;
  eyebrow?: string | null;
  title: string;
  body?: string | null;
  onPress: () => void;
}

export function DashboardHeroCard({
  event,
  daysUntil,
  eyebrow,
  title,
  body,
  onPress,
}: DashboardHeroCardProps) {
  const { tokens } = useAppTheme();

  if (event) {
    const meta = formatEventMeta(event.startTime, event.location, daysUntil);
    return (
      <EventImageSurface
        event={event}
        onPress={onPress}
        style={[styles.card, { borderColor: tokens.colors.border }]}
        pressedStyle={styles.pressed}
      >
        <View
          style={[styles.overlay, { backgroundColor: tokens.colors.overlay }]}
        />
        <View style={styles.copy}>
          <Text
            style={[
              styles.title,
              {
                color: tokens.colors.textPrimary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {title}
          </Text>
          {meta ? (
            <Text
              style={[
                styles.meta,
                {
                  color: tokens.colors.textSecondary,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              {meta}
            </Text>
          ) : null}
        </View>
      </EventImageSurface>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: tokens.colors.borderStrong,
          backgroundColor: tokens.colors.surface,
        },
        pressed && styles.pressed,
      ]}
    >
      {eyebrow ? (
        <View style={styles.top}>
          <Text
            style={[
              styles.eyebrow,
              {
                color: tokens.colors.textSecondary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {eyebrow}
          </Text>
        </View>
      ) : null}
      <View style={styles.copy}>
        <Text
          style={[
            styles.title,
            {
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {title}
        </Text>
        {body ? (
          <Text
            style={[
              styles.body,
              {
                color: tokens.colors.textSecondary,
                fontFamily: tokens.typography.sans,
              },
            ]}
            numberOfLines={3}
          >
            {body}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 6,
    borderWidth: 1,
    gap: 8,
    minHeight: 160,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 12,
    position: "relative",
    justifyContent: "flex-end",
  },
  pressed: {
    opacity: 0.96,
    transform: [{ scale: 0.996 }],
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  copy: {
    gap: 4,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "700",
    letterSpacing: -0.24,
  },
  meta: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
  },
});
