import { FontAwesome } from "@expo/vector-icons";
import { useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import type { MobileEventCard } from "@kurecal/domain";

import { useAppTheme } from "../../providers/ThemeProvider";
import { EventImageSurface } from "../shared/EventImageSurface";

interface DiscoverHeroCardProps {
  event: MobileEventCard;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

function buildEyebrow(event: MobileEventCard) {
  const start = new Date(event.startTime);
  const dateLabel = start.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  const location = event.location?.trim().split(",")[0]?.trim();
  if (location && location.toLowerCase() !== "remote") {
    return `${dateLabel} · ${location}`;
  }

  return dateLabel;
}

export function DiscoverHeroCard({
  event,
  onPress,
  style,
}: DiscoverHeroCardProps) {
  const { tokens } = useAppTheme();
  const isSaved =
    event.engagement?.isBookmarked || event.badges?.includes("Saved");
  const eyebrow = useMemo(() => buildEyebrow(event), [event]);

  return (
    <EventImageSurface
      event={event}
      onPress={onPress}
      style={[
        styles.card,
        style,
        {
          backgroundColor: tokens.colors.discoverToolbarStrong,
          borderColor: tokens.colors.discoverToolbarBorderStrong,
          shadowColor: tokens.shadow.shadowColor,
          shadowOpacity: tokens.shadow.shadowOpacity,
          shadowRadius: tokens.shadow.shadowRadius,
          shadowOffset: tokens.shadow.shadowOffset,
          elevation: tokens.shadow.elevation,
        },
      ]}
      pressedStyle={styles.pressed}
    >
      <View style={styles.chromeRow}>
        {isSaved ? (
          <View
            style={[
              styles.savedBadge,
              {
                backgroundColor: "rgba(9, 11, 14, 0.58)",
                borderColor: "rgba(255, 255, 255, 0.12)",
              },
            ]}
          >
            <FontAwesome name="bookmark" size={12} color="#F8FAFC" />
          </View>
        ) : null}
      </View>

      <View style={styles.content}>
        <Text
          numberOfLines={1}
          style={{
            color: "rgba(248, 250, 252, 0.56)",
            fontFamily: tokens.typography.sans,
            fontSize: 12,
            fontWeight: "600",
            letterSpacing: 0.66,
          }}
        >
          {eyebrow}
        </Text>
        <Text
          numberOfLines={3}
          style={{
            color: "#F8FAFC",
            fontFamily: tokens.typography.sans,
            fontSize: 20,
            lineHeight: 24,
            fontWeight: "700",
          }}
        >
          {event.title}
        </Text>
      </View>
    </EventImageSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "space-between",
    minHeight: 172,
    overflow: "hidden",
  },
  pressed: {
    opacity: 0.94,
  },
  chromeRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  content: {
    gap: 4,
    paddingBottom: 12,
    paddingHorizontal: 12,
  },
  savedBadge: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
});
