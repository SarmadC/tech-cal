import { FontAwesome } from '@expo/vector-icons';
import { useMemo, useRef } from 'react';
import {
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type {
  LocalCalendarDateKey,
  MobileCalendarEvent,
} from '@kurecal/domain';

import {
  buildCalendarWeeks,
  formatEventDateKey,
  formatMonthLabel,
  parseLocalDateKey,
} from '../../lib/calendarDateUtils';
import { useAppTheme } from '../../providers/ThemeProvider';

interface CalendarMonthGridProps {
  monthStart: LocalCalendarDateKey;
  selectedDate: LocalCalendarDateKey | null;
  events: MobileCalendarEvent[];
  eventTypeColors: Record<string, string>;
  onSelectDate: (dateKey: LocalCalendarDateKey) => void;
  onJumpToDate: (dateKey: LocalCalendarDateKey) => void;
  onChangeMonth: (offset: number) => void;
}

export function CalendarMonthGrid({
  monthStart,
  selectedDate,
  events,
  eventTypeColors,
  onSelectDate,
  onJumpToDate,
  onChangeMonth,
}: CalendarMonthGridProps) {
  const { tokens } = useAppTheme();
  const monthDate = useMemo(
    () => parseLocalDateKey(monthStart) ?? new Date(),
    [monthStart]
  );
  const weeks = useMemo(() => buildCalendarWeeks(monthDate), [monthDate]);
  const swipeLockedRef = useRef(false);

  const dayDots = useMemo(() => {
    const map = new Map<LocalCalendarDateKey, string[]>();

    events.forEach((event) => {
      const dayKey = formatEventDateKey(
        event.startTime,
        event.endTime,
        event.timezone
      );
      const color =
        (event.eventTypeId ? eventTypeColors[event.eventTypeId] : null) ??
        event.eventTypeColor ??
        tokens.colors.accent;
      const existing = map.get(dayKey) ?? [];

      if (!existing.includes(color)) {
        existing.push(color);
      }

      map.set(dayKey, existing.slice(0, 3));
    });

    return map;
  }, [eventTypeColors, events, tokens.colors.accent]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 24 && Math.abs(gesture.dy) < 14,
        onPanResponderMove: (_, gesture) => {
          if (swipeLockedRef.current || Math.abs(gesture.dx) < 64) {
            return;
          }

          swipeLockedRef.current = true;
          onChangeMonth(gesture.dx < 0 ? 1 : -1);
        },
        onPanResponderRelease: () => {
          swipeLockedRef.current = false;
        },
        onPanResponderTerminate: () => {
          swipeLockedRef.current = false;
        },
      }),
    [onChangeMonth]
  );

  return (
    <View
      {...panResponder.panHandlers}
      style={[
        styles.card,
        {
          backgroundColor: tokens.colors.discoverToolbar,
          borderColor: tokens.colors.discoverToolbarBorderStrong,
        },
      ]}
    >
      <View style={styles.monthRow}>
        <Pressable
          accessibilityLabel="Previous month"
          onPress={() => onChangeMonth(-1)}
          style={({ pressed }) => [
            styles.navButton,
            {
              backgroundColor: tokens.colors.discoverToolbarStrong,
              borderColor: tokens.colors.discoverToolbarBorder,
              opacity: pressed ? 0.82 : 1,
            },
          ]}
        >
          <FontAwesome
            name="angle-left"
            size={14}
            color={tokens.colors.discoverTextSoft}
          />
        </Pressable>

        <Text
          style={{
            color: tokens.colors.textPrimary,
            fontFamily: tokens.typography.sans,
            fontSize: 15,
            fontWeight: '700',
          }}
        >
          {formatMonthLabel(monthDate)}
        </Text>

        <Pressable
          accessibilityLabel="Next month"
          onPress={() => onChangeMonth(1)}
          style={({ pressed }) => [
            styles.navButton,
            {
              backgroundColor: tokens.colors.discoverToolbarStrong,
              borderColor: tokens.colors.discoverToolbarBorder,
              opacity: pressed ? 0.82 : 1,
            },
          ]}
        >
          <FontAwesome
            name="angle-right"
            size={14}
            color={tokens.colors.discoverTextSoft}
          />
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
          <Text
            key={day}
            style={[
              styles.weekday,
              {
                color: tokens.colors.textTertiary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {weeks.map((week, weekIndex) => (
          <View key={`week-${weekIndex}`} style={styles.weekRow}>
            {week.map((day) => {
              const dots = dayDots.get(day.key) ?? [];
              const isSelected = day.key === selectedDate;

              return (
                <Pressable
                  key={day.key}
                  accessibilityLabel={`Open ${day.key}`}
                  onPress={() => {
                    if (day.inCurrentMonth) {
                      onSelectDate(day.key);
                      return;
                    }

                    onJumpToDate(day.key);
                  }}
                  style={({ pressed }) => [
                    styles.dayButton,
                    {
                      backgroundColor: isSelected
                        ? tokens.colors.textPrimary
                        : 'transparent',
                      borderColor: isSelected
                        ? tokens.colors.textPrimary
                        : 'transparent',
                      opacity: pressed ? 0.84 : 1,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: isSelected
                        ? tokens.colors.textInverse
                        : day.isToday
                          ? tokens.colors.accent
                          : day.inCurrentMonth
                            ? tokens.colors.textPrimary
                            : tokens.colors.textTertiary,
                      fontFamily: tokens.typography.sans,
                      fontSize: 13,
                      fontWeight: isSelected || day.isToday ? '700' : '500',
                      opacity: day.inCurrentMonth ? 1 : 0.5,
                    }}
                  >
                    {day.date.getDate()}
                  </Text>

                  <View style={styles.dotRow}>
                    {dots.map((color) => (
                      <View
                        key={`${day.key}-${color}`}
                        style={[
                          styles.dot,
                          {
                            backgroundColor: isSelected
                              ? tokens.colors.textInverse
                              : color,
                            opacity: day.inCurrentMonth ? 1 : 0.6,
                          },
                        ]}
                      />
                    ))}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 16,
    gap: 12,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayRow: {
    flexDirection: 'row',
    gap: 2,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
  },
  grid: {
    gap: 6,
  },
  weekRow: {
    flexDirection: 'row',
    gap: 2,
  },
  dayButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  dotRow: {
    minHeight: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 999,
  },
});
