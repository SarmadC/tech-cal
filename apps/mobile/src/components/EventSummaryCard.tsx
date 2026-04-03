import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { MobileEventSummary } from '@kurecal/domain';

interface EventSummaryCardProps {
  event: MobileEventSummary;
  onPress?: () => void;
  tone?: 'default' | 'highlight';
}

function formatFallbackTime(startTime: string, endTime?: string | null) {
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : null;

  const dateLabel = start.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  const startLabel = start.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (!end) {
    return `${dateLabel} • ${startLabel}`;
  }

  const endLabel = end.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  return `${dateLabel} • ${startLabel} - ${endLabel}`;
}

function EventContent({ event, tone }: { event: MobileEventSummary; tone: 'default' | 'highlight' }) {
  const badges = [
    ...(event.formatLabel ? [event.formatLabel] : []),
    ...(event.priceLabel ? [event.priceLabel] : []),
    ...(event.engagement?.isBookmarked ? ['Saved'] : []),
    ...(event.engagement?.status ? [event.engagement.status === 'attending' ? 'Attending' : event.engagement.status] : []),
  ];

  return (
    <View
      style={[
        styles.card,
        tone === 'highlight' ? styles.cardHighlight : null,
      ]}
    >
      <Text style={styles.timeLabel}>
        {event.timeLabel ?? formatFallbackTime(event.startTime, event.endTime)}
      </Text>
      <Text style={styles.title}>{event.title}</Text>
      {event.description ? (
        <Text numberOfLines={2} style={styles.description}>
          {event.description}
        </Text>
      ) : null}
      <View style={styles.meta}>
        {event.organizerName ? (
          <Text style={styles.metaText}>{event.organizerName}</Text>
        ) : null}
        {event.location ? (
          <Text style={styles.metaText}>{event.location}</Text>
        ) : null}
      </View>
      {badges.length > 0 ? (
        <View style={styles.badges}>
          {badges.map((badge) => (
            <View key={badge} style={styles.badge}>
              <Text style={styles.badgeLabel}>{badge}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function EventSummaryCard({
  event,
  onPress,
  tone = 'default',
}: EventSummaryCardProps) {
  if (!onPress) {
    return <EventContent event={event} tone={tone} />;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pressable,
        pressed ? styles.pressablePressed : null,
      ]}
    >
      <EventContent event={event} tone={tone} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.18)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeLabel: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '600',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  card: {
    backgroundColor: 'rgba(7, 15, 23, 0.88)',
    borderColor: 'rgba(148, 163, 184, 0.12)',
    borderRadius: 22,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  cardHighlight: {
    backgroundColor: 'rgba(13, 32, 43, 0.94)',
    borderColor: 'rgba(45, 212, 191, 0.22)',
  },
  description: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
  },
  meta: {
    gap: 4,
  },
  metaText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '500',
  },
  pressable: {
    borderRadius: 22,
  },
  pressablePressed: {
    opacity: 0.92,
    transform: [{ scale: 0.992 }],
  },
  timeLabel: {
    color: '#2dd4bf',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  title: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
});
