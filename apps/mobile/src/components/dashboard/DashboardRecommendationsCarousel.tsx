import { Pressable, StyleSheet, Text, View } from "react-native";

import type { MobileEventCard } from "@kurecal/domain";

import { useAppTheme } from "../../providers/ThemeProvider";
import { DiscoverEventCard } from "../discover/DiscoverEventCard";

export function DashboardRecommendationsCarousel({
  recommendations,
  onOpenEvent,
  onExploreMore,
}: {
  recommendations: MobileEventCard[];
  onOpenEvent?: (eventId: string) => void;
  onExploreMore?: () => void;
}) {
  const { tokens } = useAppTheme();
  const carouselItems = recommendations.slice(1, 5);

  if (carouselItems.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text
        style={[
          styles.eyebrow,
          {
            color: tokens.colors.textSecondary,
            fontFamily: tokens.typography.sans,
          },
        ]}
      >
        Recommendation Pipeline
      </Text>

      <View>
        {carouselItems.map((event, index) => (
          <DiscoverEventCard
            key={event.id}
            event={event}
            onPress={() => onOpenEvent?.(event.id)}
            showDivider={index < carouselItems.length - 1}
          />
        ))}
      </View>

      {onExploreMore ? (
        <Pressable
          onPress={onExploreMore}
          style={({ pressed }) => [styles.exploreRow, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text
            style={[
              styles.exploreText,
              {
                color: tokens.colors.accent,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            Explore more in Discover
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 8,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 2,
  },
  exploreRow: {
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  exploreText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
