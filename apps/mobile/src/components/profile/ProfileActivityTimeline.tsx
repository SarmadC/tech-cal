import type { MobilePublicProfile } from '@kurecal/domain';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../../providers/ThemeProvider';
import { ScreenState } from '../chrome/ScreenState';
import {
  formatCommunityEventTime,
  formatNetworkingEventDate,
} from '../community/presentation';

type TimelineEvent = MobilePublicProfile['recentAttendingEvents'][number];

const MAX_VISIBLE = 5;

export function ProfileActivityTimeline({
  events,
  onEventPress,
}: {
  events: TimelineEvent[];
  onEventPress: (eventId: string) => void;
}) {
  const { tokens } = useAppTheme();

  if (events.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <ScreenState
          mode="empty"
          title="No public events yet"
          description="Recent attending events will appear here when attendance is visible."
          variant="plain"
        />
      </View>
    );
  }

  const visible = events.slice(0, MAX_VISIBLE);

  return (
    <View style={styles.list}>
      {visible.map((event, index) => {
        const isLast = index === visible.length - 1;
        const isFirst = index === 0;
        return (
          <Pressable
            key={event.id}
            accessibilityRole="button"
            accessibilityLabel={`Open event ${event.title}`}
            onPress={() => onEventPress(event.id)}
            style={({ pressed }) => [
              styles.row,
              pressed && styles.rowPressed,
            ]}
          >
            <View style={styles.rail}>
              <View
                style={[
                  styles.railLine,
                  {
                    backgroundColor: tokens.colors.divider,
                    top: isFirst ? 14 : 0,
                    bottom: isLast ? '50%' : 0,
                  },
                ]}
              />
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: isFirst
                      ? tokens.colors.accent
                      : tokens.colors.borderStrong,
                    borderColor: tokens.colors.shell,
                  },
                ]}
              />
            </View>
            <View style={styles.copy}>
              <Text
                style={[
                  styles.eyebrow,
                  {
                    color: tokens.colors.textTertiary,
                    fontFamily: tokens.typography.mono,
                  },
                ]}
              >
                {formatNetworkingEventDate(event.startTime)} ·{' '}
                {formatCommunityEventTime(event.startTime)}
              </Text>
              <Text
                numberOfLines={1}
                style={[
                  styles.title,
                  {
                    color: tokens.colors.textPrimary,
                    fontFamily: tokens.typography.sans,
                  },
                ]}
              >
                {event.title}
              </Text>
              {event.location ? (
                <Text
                  numberOfLines={1}
                  style={[
                    styles.meta,
                    {
                      color: tokens.colors.textSecondary,
                      fontFamily: tokens.typography.sans,
                    },
                  ]}
                >
                  {event.location}
                </Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  copy: {
    flex: 1,
    gap: 2,
    paddingVertical: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    borderWidth: 2,
    position: 'absolute',
    top: 14,
    left: 3,
  },
  emptyWrap: {
    paddingHorizontal: 12,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    lineHeight: 14,
    textTransform: 'uppercase',
  },
  list: {
    paddingHorizontal: 12,
  },
  meta: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  rail: {
    position: 'relative',
    width: 16,
  },
  railLine: {
    position: 'absolute',
    left: 7,
    width: StyleSheet.hairlineWidth * 2,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 8,
  },
  rowPressed: {
    opacity: 0.84,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
  },
});
