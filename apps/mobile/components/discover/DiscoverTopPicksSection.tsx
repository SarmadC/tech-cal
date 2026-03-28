import { FontAwesome } from '@expo/vector-icons';
import { useState, type ReactElement } from 'react';
import {
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { MobileDiscoverFeed, MobileEventCard } from '@kurecal/domain';
import { useAppTheme } from '@/providers/ThemeProvider';
import { DiscoverHeroCard } from '@/components/discover/DiscoverHeroCard';

interface DiscoverTopPicksSectionProps {
  topPicks: NonNullable<MobileDiscoverFeed['topPicks']>;
  onPressCard?: (event: MobileEventCard) => void;
}

const CARD_GAP = 12;
const DEFAULT_WIDTH = 320;

export function DiscoverTopPicksSection({
  topPicks,
  onPressCard,
}: DiscoverTopPicksSectionProps): ReactElement {
  const { tokens } = useAppTheme();
  const [containerWidth, setContainerWidth] = useState(DEFAULT_WIDTH);
  const [activeIndex, setActiveIndex] = useState(0);
  const isCarousel = topPicks.cards.length > 1;
  const cardWidth = isCarousel
    ? Math.max(280, Math.min(Math.round(containerWidth * 0.88), 360))
    : containerWidth;

  function handleLayout(event: LayoutChangeEvent) {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    if (nextWidth > 0 && nextWidth !== containerWidth) {
      setContainerWidth(nextWidth);
    }
  }

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (!isCarousel) {
      return;
    }

    const interval = cardWidth + CARD_GAP;
    const nextIndex = Math.max(
      0,
      Math.min(
        topPicks.cards.length - 1,
        Math.round(event.nativeEvent.contentOffset.x / interval)
      )
    );

    if (nextIndex !== activeIndex) {
      setActiveIndex(nextIndex);
    }
  }

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <FontAwesome name="star" size={12} color={tokens.colors.warning} />
          <Text
            style={{
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
              fontSize: 14,
              fontWeight: '700',
            }}
          >
            {topPicks.title}
          </Text>
        </View>
        {isCarousel ? (
          <Text
            style={{
              color: tokens.colors.discoverTextMuted,
              fontFamily: tokens.typography.sans,
              fontSize: 11,
              fontWeight: '600',
            }}
          >
            {topPicks.cards.length} picks
          </Text>
        ) : null}
      </View>

      <View onLayout={handleLayout}>
        {isCarousel ? (
          <>
            <ScrollView
              horizontal
              decelerationRate="fast"
              disableIntervalMomentum
              onScroll={handleScroll}
              scrollEventThrottle={16}
              showsHorizontalScrollIndicator={false}
              snapToAlignment="start"
              snapToInterval={cardWidth + CARD_GAP}
              contentContainerStyle={{
                paddingRight: Math.max(0, containerWidth - cardWidth),
              }}
            >
              {topPicks.cards.map((event, index) => (
                <DiscoverHeroCard
                  key={event.id}
                  event={event}
                  onPress={() => onPressCard?.(event)}
                  style={{
                    width: cardWidth,
                    marginRight: index === topPicks.cards.length - 1 ? 0 : CARD_GAP,
                  }}
                />
              ))}
            </ScrollView>

            <View
              accessibilityLabel="Top picks pagination"
              style={styles.dotsRow}
            >
              {topPicks.cards.map((event, index) => (
                <View
                  key={event.id}
                  accessibilityLabel={`Top pick page ${index + 1}`}
                  accessible
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        index === activeIndex
                          ? tokens.colors.textPrimary
                          : tokens.colors.discoverToolbarBorderStrong,
                      width: index === activeIndex ? 16 : 6,
                    },
                  ]}
                />
              ))}
            </View>
          </>
        ) : (
          <DiscoverHeroCard
            event={topPicks.cards[0]}
            onPress={() => onPressCard?.(topPicks.cards[0])}
            style={styles.singleCard}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  singleCard: {
    width: '100%',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 8,
  },
  dot: {
    height: 6,
    borderRadius: 999,
  },
});
