import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { MobileEventCard } from '@kurecal/domain';

import { useAppTheme } from '../../providers/ThemeProvider';

export function EventCard({
  event,
  onPress,
}: {
  event: MobileEventCard;
  onPress?: () => void;
}) {
  const { tokens } = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.md,
          shadowColor: tokens.shadow.shadowColor,
          shadowOpacity: tokens.shadow.shadowOpacity,
          shadowRadius: tokens.shadow.shadowRadius,
          shadowOffset: tokens.shadow.shadowOffset,
          elevation: tokens.shadow.elevation,
        },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.topline}>
        <Text
          style={{
            color: tokens.colors.textSecondary,
            fontFamily: tokens.typography.sans,
            fontSize: 13,
            fontWeight: '700',
          }}
        >
          {event.timeLabel ?? 'Upcoming'}
        </Text>
        {typeof event.score === 'number' ? (
          <View
            style={[
              styles.scorePill,
              {
                backgroundColor: tokens.colors.accentSoft,
                borderColor: tokens.colors.border,
              },
            ]}
          >
            <Text
              style={{
                color: tokens.colors.accent,
                fontFamily: tokens.typography.sans,
                fontSize: 12,
                fontWeight: '800',
              }}
            >
              {Math.round(event.score)}
            </Text>
          </View>
        ) : null}
      </View>

      {event.badges?.length ? (
        <View style={styles.badgeRow}>
          {event.badges.map((badge) => (
            <View
              key={badge}
              style={[
                styles.badge,
                {
                  backgroundColor: tokens.colors.surfaceStrong,
                  borderColor: tokens.colors.border,
                  borderRadius: tokens.radius.pill,
                },
              ]}
            >
              <Text
                style={{
                  color: tokens.colors.textSecondary,
                  fontFamily: tokens.typography.sans,
                  fontSize: 11,
                  fontWeight: '700',
                }}
              >
                {badge}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text
        style={{
          color: tokens.colors.textPrimary,
          fontFamily: tokens.typography.sans,
          fontSize: 20,
          lineHeight: 24,
          fontWeight: '800',
        }}
      >
        {event.title}
      </Text>

      <Text
        style={{
          color: tokens.colors.textSecondary,
          fontFamily: tokens.typography.sans,
          fontSize: 14,
          lineHeight: 20,
        }}
      >
        {[event.organizerName, event.location].filter(Boolean).join(' • ') || 'Event'}
      </Text>

      {event.insight ? (
        <Text
          style={{
            color: tokens.colors.accent,
            fontFamily: tokens.typography.sans,
            fontSize: 13,
            fontWeight: '700',
          }}
        >
          {event.insight}
        </Text>
      ) : null}

      {event.description ? (
        <Text
          numberOfLines={3}
          style={{
            color: tokens.colors.textSecondary,
            fontFamily: tokens.typography.sans,
            fontSize: 14,
            lineHeight: 20,
          }}
        >
          {event.description}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  topline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  scorePill: {
    minWidth: 38,
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
});
