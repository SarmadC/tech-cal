import { FontAwesome } from "@expo/vector-icons";
import Animated from "react-native-reanimated";
import { useMemo } from "react";
import {

  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import type { MobileEventCard } from "@kurecal/domain";

import { showActionSheet } from "../../lib/actionSheet";
import { haptics } from "../../lib/haptics";
import { useAppTheme } from "../../providers/ThemeProvider";
import { useScalePress } from "../../hooks/useAnimation";
import { shareEventCard } from "./DiscoverEventCard";
import { EventImageSurface } from "../shared/EventImageSurface";
import { formatEventEyebrow, isEventSaved } from "../../utils/eventMeta";

interface DiscoverHeroCardProps {
  event: MobileEventCard;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function DiscoverHeroCard({
  event,
  onPress,
  style,
}: DiscoverHeroCardProps) {
  const { tokens } = useAppTheme();
  const { fontScale } = useWindowDimensions();
  const usesAccessibilityLayout = fontScale >= 1.8;
  const { scale, onPressIn, onPressOut } = useScalePress({ haptic: true });
  const isSaved = isEventSaved(event);
  const eyebrow = useMemo(() => formatEventEyebrow(event.startTime, event.location), [event]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
    <EventImageSurface
      event={event}
      onPress={onPress}
      onLongPress={() => {
        haptics.medium();
        showActionSheet({
          title: event.title,
          options: [
            { label: "Open", onPress: () => onPress?.() },
            { label: "Share", onPress: () => shareEventCard(event) },
          ],
        });
      }}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[
        styles.card,
        { minHeight: 224 + Math.max(0, fontScale - 1) * 88 },
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
          numberOfLines={usesAccessibilityLayout ? 2 : 1}
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
          numberOfLines={usesAccessibilityLayout ? 5 : 3}
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "space-between",
    minHeight: 224,
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
