import { useEffect, useState } from "react";
import Animated from "react-native-reanimated";
import { Image as ExpoImage } from "expo-image";
import { Pressable, Share, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import type { MobileEventCard } from "@kurecal/domain";

import { showActionSheet } from "../../lib/actionSheet";
import { getMobileApiBaseUrl } from "../../lib/env";
import { haptics } from "../../lib/haptics";
import { useAppTheme } from "../../providers/ThemeProvider";
import { useScalePress } from "../../hooks/useAnimation";
import { isEventSaved } from "../../utils/eventMeta";

export function shareEventCard(event: MobileEventCard) {
  let url: string | null = null;
  try {
    url = new URL(`/events/${event.slug}`, getMobileApiBaseUrl()).toString();
  } catch {
    url = null;
  }

  void Share.share({
    message: [event.title, url].filter(Boolean).join("\n"),
  }).catch(() => {
    // iOS throws on cancel; ignore.
  });
}

interface DiscoverEventCardProps {
  accessibilityLabel?: string;
  event: MobileEventCard;
  onPress?: () => void;
  showDivider?: boolean;
  showSavedIndicator?: boolean;
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
  accessibilityLabel,
  event,
  onPress,
  showDivider = true,
  showSavedIndicator = true,
}: DiscoverEventCardProps) {
  const { tokens } = useAppTheme();
  const { fontScale } = useWindowDimensions();
  const usesAccessibilityLayout = fontScale >= 1.8;
  const { scale, onPressIn, onPressOut } = useScalePress({ haptic: true });
  const initialImage = event.organizerLogoUrl ?? event.imageUrl ?? null;
  const [imageUri, setImageUri] = useState<string | null>(initialImage);
  const metadataLine = buildMetadataLine(event);
  const isSaved = showSavedIndicator && isEventSaved(event);

  useEffect(() => {
    setImageUri(initialImage);
  }, [initialImage]);

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? `Open recommended event ${event.title}`}
      accessibilityRole="button"
      onPress={onPress}
      onLongPress={() => {
        haptics.medium();
        showActionSheet({
          title: event.title,
          options: [
            { label: "Open", onPress },
            { label: "Share", onPress: () => shareEventCard(event) },
          ],
        });
      }}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={styles.pressable}
    >
      <Animated.View style={[styles.row, { transform: [{ scale }] }]}>
        {/* Logo frame — fixed container normalizes all mark sizes */}
        <View style={styles.logoWrap}>
          <View style={styles.logoFrame}>
            {imageUri ? (
              <ExpoImage
                source={{ uri: imageUri }}
                style={styles.logoImage}
                contentFit="contain"
                cachePolicy="memory-disk"
                recyclingKey={imageUri}
                transition={120}
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
            numberOfLines={usesAccessibilityLayout ? 4 : 2}
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
            numberOfLines={usesAccessibilityLayout ? 2 : 1}
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
    paddingVertical: 12,
    minHeight: 60,
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
