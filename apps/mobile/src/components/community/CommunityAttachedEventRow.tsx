import { useState } from "react";
import Animated from "react-native-reanimated";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { useScalePress } from "../../hooks/useAnimation";
import { useAppTheme } from "../../providers/ThemeProvider";

export interface CommunityAttachedEventRowEvent {
  id: string;
  title: string;
  startTime: string;
  location?: string | null;
  format?: string | null;
  formatLabel?: string | null;
  imageUrl?: string | null;
  organizerLogoUrl?: string | null;
}

interface CommunityAttachedEventRowProps {
  event: CommunityAttachedEventRowEvent;
  onPress?: () => void;
  showDivider?: boolean;
  variant?: "picker" | "selected";
}

function formatDateLabel(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function splitLocation(location: string | null | undefined): string | null {
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

function formatEventFormat(event: CommunityAttachedEventRowEvent): string | null {
  const format = event.format ?? event.formatLabel;

  if (format === "virtual") {
    return "Virtual";
  }

  if (format === "in-person") {
    return "In person";
  }

  if (format === "hybrid") {
    return "Hybrid";
  }

  return format?.trim() || null;
}

function buildMetadata(event: CommunityAttachedEventRowEvent): string {
  const format = event.format ?? event.formatLabel;
  const dateLabel = formatDateLabel(event.startTime);
  const locationLabel = splitLocation(event.location);
  const formatLabel = formatEventFormat(event);
  const parts = [dateLabel];

  if (format === "virtual") {
    if (formatLabel) {
      parts.push(formatLabel);
    }
  } else if (format === "hybrid") {
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

  return parts.join(" · ");
}

export function CommunityAttachedEventRow({
  event,
  onPress,
  showDivider = false,
  variant = "picker",
}: CommunityAttachedEventRowProps) {
  const { tokens } = useAppTheme();
  const { scale, onPressIn, onPressOut } = useScalePress();
  const initialImage = event.organizerLogoUrl ?? event.imageUrl ?? null;
  const [imageUri, setImageUri] = useState<string | null>(initialImage);
  const metadataLine = buildMetadata(event);
  const isSelected = variant === "selected";

  return (
    <Pressable
      accessibilityLabel={`${onPress ? "Open" : "Attached"} event ${event.title}`}
      accessibilityRole={onPress ? "button" : "text"}
      disabled={!onPress}
      onPress={onPress}
      onPressIn={onPress ? onPressIn : undefined}
      onPressOut={onPress ? onPressOut : undefined}
      style={[
        styles.pressable,
        isSelected && {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.accentSoft,
          borderRadius: tokens.radius.md,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.row,
          isSelected && styles.selectedRow,
          { transform: [{ scale }] },
        ]}
      >
        <View style={styles.logoWrap}>
          <View style={styles.logoFrame}>
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                resizeMode="contain"
                style={styles.logoImage}
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
                style={[
                  styles.logoInitial,
                  {
                    color: tokens.colors.textTertiary,
                    fontFamily: tokens.typography.sans,
                  },
                ]}
              >
                {event.title.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.copy}>
          <Text
            numberOfLines={2}
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
          {metadataLine ? (
            <Text
              numberOfLines={1}
              style={[
                styles.meta,
                {
                  color: tokens.colors.discoverTextMuted,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              {metadataLine}
            </Text>
          ) : null}
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

const styles = StyleSheet.create({
  copy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  logoFrame: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 4,
    height: 38,
    justifyContent: "center",
    overflow: "hidden",
    padding: 4,
    width: 38,
  },
  logoImage: {
    height: "100%",
    width: "100%",
  },
  logoInitial: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
  logoWrap: {
    flexShrink: 0,
    marginTop: 1,
  },
  meta: {
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 16,
  },
  pressable: {
    borderRadius: 4,
    borderWidth: 0,
  },
  row: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 4,
    paddingVertical: 9,
  },
  selectedRow: {
    padding: 12,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 54,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
});
