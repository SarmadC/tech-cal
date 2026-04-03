import { Pressable, StyleSheet, Text, View } from 'react-native';

import type {
  LocalCalendarDateKey,
  MobileCalendarDaySummary,
} from '@kurecal/domain';

interface CalendarMonthGridProps {
  days: MobileCalendarDaySummary[];
  onSelectDate: (dateKey: LocalCalendarDateKey) => void;
  selectedDate: LocalCalendarDateKey | null;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarMonthGrid({
  days,
  onSelectDate,
  selectedDate,
}: CalendarMonthGridProps) {
  const weeks = Array.from({ length: Math.ceil(days.length / 7) }, (_, index) =>
    days.slice(index * 7, index * 7 + 7)
  );

  return (
    <View style={styles.root}>
      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label) => (
          <Text key={label} style={styles.weekdayLabel}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.weeks}>
        {weeks.map((week, weekIndex) => (
          <View key={`week-${weekIndex}`} style={styles.weekRow}>
            {week.map((day) => {
              const isSelected = day.dateKey === selectedDate;
              const hasEvents = day.eventCount > 0;

              return (
                <Pressable
                  key={day.dateKey}
                  accessibilityLabel={`${day.dateKey}, ${day.eventCount} events`}
                  onPress={() => onSelectDate(day.dateKey)}
                  style={({ pressed }) => [
                    styles.dayButton,
                    isSelected ? styles.dayButtonSelected : null,
                    day.isToday && !isSelected ? styles.dayButtonToday : null,
                    !day.inCurrentMonth ? styles.dayButtonOutsideMonth : null,
                    pressed ? styles.dayButtonPressed : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      isSelected ? styles.dayNumberSelected : null,
                      !day.inCurrentMonth ? styles.dayNumberOutsideMonth : null,
                    ]}
                  >
                    {day.dayNumber}
                  </Text>

                  {hasEvents ? (
                    <View style={styles.metaRow}>
                      <View
                        style={[
                          styles.eventCountPill,
                          isSelected ? styles.eventCountPillSelected : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.eventCountLabel,
                            isSelected ? styles.eventCountLabelSelected : null,
                          ]}
                        >
                          {day.eventCount}
                        </Text>
                      </View>
                      {day.savedCount > 0 ? (
                        <View style={styles.savedDot} />
                      ) : null}
                      {day.attendingCount > 0 ? (
                        <View style={styles.attendingDot} />
                      ) : null}
                    </View>
                  ) : (
                    <View style={styles.metaRow} />
                  )}
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
  attendingDot: {
    backgroundColor: '#f59e0b',
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  dayButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.56)',
    borderColor: 'rgba(148, 163, 184, 0.12)',
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    minHeight: 66,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  dayButtonOutsideMonth: {
    backgroundColor: 'rgba(7, 15, 23, 0.3)',
    borderColor: 'rgba(148, 163, 184, 0.06)',
  },
  dayButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  dayButtonSelected: {
    backgroundColor: 'rgba(45, 212, 191, 0.18)',
    borderColor: 'rgba(45, 212, 191, 0.44)',
  },
  dayButtonToday: {
    borderColor: 'rgba(125, 211, 252, 0.42)',
  },
  dayNumber: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
  },
  dayNumberOutsideMonth: {
    color: '#64748b',
  },
  dayNumberSelected: {
    color: '#ccfbf1',
  },
  eventCountLabel: {
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: '700',
  },
  eventCountLabelSelected: {
    color: '#ccfbf1',
  },
  eventCountPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderRadius: 999,
    justifyContent: 'center',
    minWidth: 18,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  eventCountPillSelected: {
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    minHeight: 12,
  },
  root: {
    gap: 10,
  },
  savedDot: {
    backgroundColor: '#2dd4bf',
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  weekdayLabel: {
    color: '#64748b',
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  weekdayRow: {
    flexDirection: 'row',
    gap: 8,
  },
  weekRow: {
    flexDirection: 'row',
    gap: 8,
  },
  weeks: {
    gap: 8,
  },
});
