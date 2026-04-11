import { FontAwesome5 } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { MobileEventCard } from '@kurecal/domain';

import { DashboardCard } from './DashboardCard';
import { useAppTheme } from '../../providers/ThemeProvider';

function formatMeta(event: MobileEventCard) {
  const dateLabel = new Date(event.startTime).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  const parts = [dateLabel];
  if (event.location?.trim()) {
    parts.push(event.location.trim());
  }
  return parts.join(' • ');
}

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
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text
            style={[
              styles.eyebrow,
              { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans },
            ]}
          >
            Recommendation Pipeline
          </Text>
          <Text
            style={[
              styles.title,
              { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans },
            ]}
          >
            More ranked next moves
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={276}
        snapToAlignment="start"
        contentContainerStyle={styles.scrollContent}
      >
        {carouselItems.map((event) => (
          <Pressable
            key={event.id}
            onPress={() => onOpenEvent?.(event.id)}
            style={styles.cardPressable}
          >
            {({ pressed }) => (
              <DashboardCard
                style={[
                  styles.card,
                  {
                    borderColor: tokens.colors.border,
                    backgroundColor: tokens.colors.surface,
                  },
                  pressed && styles.cardPressed,
                ]}
              >
                <View style={styles.cardBody}>
                  <View style={styles.cardTop}>
                    <Text
                      style={[
                        styles.eventTitle,
                        { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans },
                      ]}
                      numberOfLines={2}
                    >
                      {event.title}
                    </Text>

                    {typeof event.score === 'number' ? (
                      <View
                        style={[
                          styles.scoreBadge,
                          {
                            backgroundColor: tokens.colors.accentSoft,
                            borderColor: tokens.colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.scoreText,
                            { color: tokens.colors.accent, fontFamily: tokens.typography.mono },
                          ]}
                        >
                          {Math.round(event.score)}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <Text
                    style={[
                      styles.meta,
                      { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans },
                    ]}
                  >
                    {formatMeta(event)}
                  </Text>

                  <Text
                    style={[
                      styles.insight,
                      { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans },
                    ]}
                    numberOfLines={3}
                  >
                    {event.insight ?? event.description ?? 'Fresh recommendation from your dashboard pipeline.'}
                  </Text>

                  <View style={styles.footer}>
                    <Text
                      style={[
                        styles.footerText,
                        { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans },
                      ]}
                    >
                      Open event
                    </Text>
                    <FontAwesome5
                      name="arrow-right"
                      size={13}
                      color={tokens.colors.textPrimary}
                    />
                  </View>
                </View>
              </DashboardCard>
            )}
          </Pressable>
        ))}

        <Pressable onPress={onExploreMore} style={styles.cardPressable}>
          {({ pressed }) => (
            <DashboardCard
              style={[
                styles.card,
                {
                  borderColor: tokens.colors.borderStrong,
                  backgroundColor: tokens.colors.surface,
                },
                pressed && styles.cardPressed,
              ]}
            >
              <View style={styles.exploreCard}>
                <View
                  style={[
                    styles.exploreBadge,
                    {
                      backgroundColor: tokens.colors.accentSoft,
                      borderColor: tokens.colors.border,
                    },
                  ]}
                >
                  <FontAwesome5
                    name="compass"
                    size={14}
                    color={tokens.colors.accent}
                  />
                </View>
                <Text
                  style={[
                    styles.exploreTitle,
                    { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans },
                  ]}
                >
                  Explore more
                </Text>
                <Text
                  style={[
                    styles.exploreBody,
                    { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans },
                  ]}
                >
                  Jump into Discover for the full ranked pipeline.
                </Text>
              </View>
            </DashboardCard>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  header: {
    paddingHorizontal: 2,
  },
  copy: {
    gap: 4,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  scrollContent: {
    paddingRight: 8,
  },
  cardPressable: {
    width: 260,
    marginRight: 16,
  },
  card: {
    minHeight: 210,
    borderRadius: 20,
  },
  cardPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.995 }],
  },
  cardBody: {
    flex: 1,
    gap: 12,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  eventTitle: {
    flex: 1,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  scoreBadge: {
    minWidth: 44,
    minHeight: 28,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '700',
  },
  meta: {
    fontSize: 12,
    lineHeight: 16,
  },
  insight: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 14,
    fontWeight: '700',
  },
  exploreCard: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 12,
  },
  exploreBadge: {
    width: 42,
    height: 42,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exploreTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  exploreBody: {
    fontSize: 14,
    lineHeight: 20,
  },
});
