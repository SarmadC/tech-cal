import { useState } from "react";
import { Animated, Image, Pressable, StyleSheet, Text, View } from "react-native";

import type { MobileEventCard } from "@kurecal/domain";

import { useAppTheme } from "../../providers/ThemeProvider";
import { useScalePress } from "../../hooks/useAnimation";

interface DiscoverEventCardProps {
  event: MobileEventCard;
  onPress?: () => void;
  showDivider?: boolean;
}

function formatDateLabel(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function splitLocation(location: string | null | undefined) {
  const value = location?.trim();
  if (!value) {
    return null;
  }

  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return parts[0] ?? value;
}

function resolveFormatLabel(event: MobileEventCard) {
  if (event.format === "virtual") {
    return "Virtual";
  }

  if (event.format === "in-person") {
    return "In person";
  }

  if (event.format === "hybrid") {
    return "Hybrid";
  }

  return event.formatLabel?.trim() || null;
}

function buildMetadataLine(event: MobileEventCard) {
  const dateLabel = formatDateLabel(event.startTime);
  const formatLabel = resolveFormatLabel(event);
  const locationLabel = splitLocation(event.location);
  const priceLabel = event.priceLabel?.trim() || null;
  const parts = [dateLabel];

  if (event.format === "virtual") {
    if (formatLabel) {
      parts.push(formatLabel);
    }
  } else if (event.format === "hybrid") {
    if (formatLabel) {
      parts.push(formatLabel);
    }

    if (locationLabel && locationLabel.toLowerCase() !== "remote") {
      parts.push(locationLabel);
    }
  } else if (locationLabel && locationLabel.toLowerCase() !== "remote") {
    parts.push(locationLabel);
  } else if (formatLabel) {
    parts.push(formatLabel);
  }

  if (priceLabel) {
    parts.push(priceLabel);
  }

  return parts.join(" · ");
}

export function DiscoverEventCard({
  event,
  onPress,
  showDivider = true,
}: DiscoverEventCardProps) {
  const { tokens } = useAppTheme();
  const { scale, onPressIn, onPressOut } = useScalePress();
  const initialImage = event.organizerLogoUrl ?? event.imageUrl ?? null;
  const [imageUri, setImageUri] = useState<string | null>(initialImage);
  const metadataLine = buildMetadataLine(event);
  const isSaved =
    event.engagement?.isBookmarked || event.badges?.includes("Saved");

  return (
    <Pressable
      accessibilityLabel={`Open recommended event ${event.title}`}
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={styles.pressable}
    >
      <Animated.View style={[styles.row, { transform: [{ scale }] }]}>
        {/* Logo frame — fixed container normalizes all mark sizes */}
        <View style={styles.logoWrap}>
          <View style={styles.logoFrame}>
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={styles.logoImage}
                resizeMode="contain"
                onError={() => {
                  if (imageUri === event.organizerLogoUrl) {
                    setImageUri(event.imageUrl ?? null);
                    return;
                  }
                  setImageUri(null);
                }}
              />
            ) : (
              <Text
                style={{
                  color: tokens.colors.textTertiary,
                  fontFamily: tokens.typography.sans,
                  fontSize: 15,
                  fontWeight: "600",
                }}
              >
                {event.title.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          {isSaved ? (
            <View
              style={[
                styles.savedDot,
                { backgroundColor: tokens.colors.accent },
              ]}
            />
          ) : null}
        </View>

        <View style={styles.copy}>
          <Text
            numberOfLines={2}
            style={{
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
              fontSize: 15,
              lineHeight: 20,
              fontWeight: "600",
            }}
          >
            {event.title}
          </Text>

          <Text
            numberOfLines={1}
            style={{
              color: tokens.colors.discoverTextMuted,
              fontFamily: tokens.typography.sans,
              fontSize: 12,
              fontWeight: "400",
              lineHeight: 16,
            }}
          >
            {metadataLine}
          </Text>
        </View>
      </Animated.View>

      {showDivider ? (
        <View
          style={[styles.separator, { backgroundColor: tokens.colors.divider }]}
        />
      ) : null}
    </Pressable>
  );
}

const LOGO_SIZE = 38;
const ROW_GAP = 12;
const ROW_PADDING_H = 4;

const styles = StyleSheet.create({
  copy: {
    flex: 1,
    gap: 3,
  },
  logoFrame: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 4,
    height: LOGO_SIZE,
    justifyContent: "center",
    overflow: "hidden",
    padding: 4,
    width: LOGO_SIZE,
  },
  logoImage: {
    height: "100%",
    width: "100%",
  },
  logoWrap: {
    flexShrink: 0,
    marginTop: 1,
  },
  pressable: {
    borderRadius: 4,
  },
  row: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: ROW_GAP,
    paddingHorizontal: ROW_PADDING_H,
    paddingVertical: 9,
  },
  savedDot: {
    borderRadius: 999,
    bottom: 0,
    height: 8,
    position: "absolute",
    right: 0,
    width: 8,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: ROW_PADDING_H + LOGO_SIZE + ROW_GAP,
  },
});
