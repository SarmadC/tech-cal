import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
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

const CARD_GAP = 10;
const DEFAULT_WIDTH = 320;

export function DiscoverTopPicksSection({
  onPressCard,
  topPicks,
}: DiscoverTopPicksSectionProps) {
  const { tokens } = useAppTheme();
  const [containerWidth, setContainerWidth] = useState(DEFAULT_WIDTH);
  const [activeIndex, setActiveIndex] = useState(0);
  const isCarousel = topPicks.cards.length > 1;

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

    const interval = containerWidth + CARD_GAP;
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
    <View onLayout={handleLayout} style={styles.section}>
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
            snapToInterval={containerWidth + CARD_GAP}
          >
            {topPicks.cards.map((event, index) => (
              <DiscoverHeroCard
                key={event.id}
                event={event}
                onPress={() => onPressCard?.(event)}
                style={{
                  marginRight: index === topPicks.cards.length - 1 ? 0 : CARD_GAP,
                  width: containerWidth,
                }}
              />
            ))}
          </ScrollView>

          <View accessibilityLabel="Top picks pagination" style={styles.dotsOverlay}>
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
                        ? 'rgba(255, 255, 255, 0.92)'
                        : 'rgba(255, 255, 255, 0.35)',
                    width: index === activeIndex ? 16 : 5,
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
  );
}

const styles = StyleSheet.create({
  dot: {
    borderRadius: 999,
    height: 5,
  },
  dotsOverlay: {
    alignItems: 'center',
    bottom: 12,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
  },
  section: {
    position: 'relative',
  },
  singleCard: {
    width: '100%',
  },
});
