import { FontAwesome } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import type { MobileEventCard } from '@kurecal/domain';

import { useAppTheme } from '../../providers/ThemeProvider';
import { EventImageSurface } from '../shared/EventImageSurface';

interface DiscoverHeroCardProps {
  event: MobileEventCard;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

function buildHeroDate(event: MobileEventCard) {
  const start = new Date(event.startTime);

  return {
    dateLabel: start.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    }),
  };
}

function splitLocation(location: string | null | undefined) {
  if (!location?.trim()) {
    return {
      primary: 'Location TBA',
      secondary: null,
    };
  }

  const parts = location
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    primary: parts[0] ?? location,
    secondary: parts.length > 1 ? parts.slice(1).join(', ') : null,
  };
}

export function DiscoverHeroCard({ event, onPress, style }: DiscoverHeroCardProps) {
  const { tokens } = useAppTheme();
  const isSaved = event.engagement?.isBookmarked || event.badges?.includes('Saved');
  const { dateLabel } = useMemo(() => buildHeroDate(event), [event]);
  const location = useMemo(() => splitLocation(event.location), [event.location]);

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
          shadowOpacity: tokens.shadow.shadowOpacity * 0.22,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 6,
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
                backgroundColor: 'rgba(9, 11, 14, 0.58)',
                borderColor: 'rgba(255, 255, 255, 0.12)',
              },
            ]}
          >
            <FontAwesome name="bookmark" size={12} color="#F8FAFC" />
          </View>
        ) : null}
      </View>

      <View style={styles.content}>
        <Text
          numberOfLines={3}
          style={{
            color: '#F8FAFC',
            fontFamily: tokens.typography.sans,
            fontSize: 20,
            lineHeight: 24,
            fontWeight: '800',
          }}
        >
          {event.title}
        </Text>

        <View
          style={[
            styles.metaRow,
            {
              borderTopColor: 'rgba(255, 255, 255, 0.16)',
            },
          ]}
        >
          <View style={styles.metaCopy}>
            <Text
              style={{
                color: '#F8FAFC',
                fontFamily: tokens.typography.mono,
                fontSize: 12,
                lineHeight: 16,
                fontWeight: '700',
              }}
            >
              {dateLabel}
            </Text>
            <Text
              numberOfLines={2}
              style={{
                color: 'rgba(248, 250, 252, 0.82)',
                fontFamily: tokens.typography.sans,
                fontSize: 12,
                lineHeight: 16,
                fontWeight: '600',
              }}
            >
              {location.primary}
              {location.secondary ? ` • ${location.secondary}` : ''}
            </Text>
          </View>
        </View>
      </View>
    </EventImageSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: 'space-between',
    minHeight: 184,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.94,
  },
  chromeRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  content: {
    gap: 10,
    paddingBottom: 12,
    paddingHorizontal: 14,
  },
  metaCopy: {
    gap: 2,
  },
  metaRow: {
    borderTopWidth: 1,
    gap: 10,
    paddingTop: 8,
  },
  savedBadge: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
});
