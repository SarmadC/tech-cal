import { FontAwesome } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import type { MobileDiscoverFeed, MobileEventCard } from '@kurecal/domain';

import { useAppTheme } from '../../providers/ThemeProvider';
import { DiscoverHeroCard } from './DiscoverHeroCard';

interface DiscoverTopPicksSectionProps {
  onPressCard?: (event: MobileEventCard) => void;
  topPicks: NonNullable<MobileDiscoverFeed['topPicks']>;
}

const CARD_GAP = 12;
const DEFAULT_WIDTH = 320;

export function DiscoverTopPicksSection({
  onPressCard,
  topPicks,
}: DiscoverTopPicksSectionProps) {
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
          <FontAwesome color={tokens.colors.warning} name="star" size={12} />
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
              contentContainerStyle={{
                paddingRight: Math.max(0, containerWidth - cardWidth),
              }}
              decelerationRate="fast"
              disableIntervalMomentum
              onScroll={handleScroll}
              scrollEventThrottle={16}
              showsHorizontalScrollIndicator={false}
              snapToAlignment="start"
              snapToInterval={cardWidth + CARD_GAP}
            >
              {topPicks.cards.map((event, index) => (
                <DiscoverHeroCard
                  key={event.id}
                  event={event}
                  onPress={() => onPressCard?.(event)}
                  style={{
                    marginRight: index === topPicks.cards.length - 1 ? 0 : CARD_GAP,
                    width: cardWidth,
                  }}
                />
              ))}
            </ScrollView>

            <View accessibilityLabel="Top picks pagination" style={styles.dotsRow}>
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
  dot: {
    borderRadius: 999,
    height: 6,
  },
  dotsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingTop: 8,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  section: {
    gap: 10,
  },
  singleCard: {
    width: '100%',
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
});
