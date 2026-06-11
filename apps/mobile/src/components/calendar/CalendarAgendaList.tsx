import type { ReactNode } from 'react';
import { useCallback, useMemo, useRef } from 'react';
import {
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type {
  LocalCalendarDateKey,
  MobileCalendarEvent,
} from '@kurecal/domain';

import {
  formatEventDateKey,
  formatEventStartTimeLabel,
  formatLocalDateKey,
  parseLocalDateKey,
  resolveMonthStartKey,
} from '../../lib/calendarDateUtils';
import { useAppTheme } from '../../providers/ThemeProvider';

interface CalendarAgendaListProps {
  events: MobileCalendarEvent[];
  selectedDate: LocalCalendarDateKey | null;
  onPressEvent: (eventId: string) => void;
  header?: ReactNode;
  emptyState?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  topInset?: number;
  bottomInset?: number;
  monthStart?: LocalCalendarDateKey | null;
}

export type AgendaSection = {
  dateKey: LocalCalendarDateKey;
  data: MobileCalendarEvent[];
};

const RAIL_WIDTH = 52;
const RAIL_GAP = 12;

function formatWeekdayLabel(dateKey: LocalCalendarDateKey) {
  const date = parseLocalDateKey(dateKey) ?? new Date();
  return date.toLocaleDateString(undefined, { weekday: 'short' });
}

function formatDayNumber(dateKey: LocalCalendarDateKey) {
  const date = parseLocalDateKey(dateKey) ?? new Date();
  return String(date.getDate());
}

function resolveEventAccentColor(
  event: MobileCalendarEvent,
  colors: ReturnType<typeof useAppTheme>['tokens']['colors']
) {
  if (event.engagement?.status === 'attending') {
    return colors.success;
  }

  if (event.engagement?.isBookmarked) {
    return colors.accent;
  }

  return null;
}

function hasUpcomingEventInSection(section: AgendaSection, now: Date) {
  const nowTime = now.getTime();

  return section.data.some((event) => {
    const startTime = new Date(event.startTime).getTime();
    return !Number.isNaN(startTime) && startTime >= nowTime;
  });
}

export function buildAgendaSections(events: MobileCalendarEvent[]): AgendaSection[] {
  const grouped = new Map<LocalCalendarDateKey, MobileCalendarEvent[]>();

  events
    .slice()
    .sort(
      (left, right) =>
        new Date(left.startTime).getTime() - new Date(right.startTime).getTime()
    )
    .forEach((event) => {
      const dateKey = formatEventDateKey(
        event.startTime,
        event.endTime,
        event.timezone
      );
      const dayEvents = grouped.get(dateKey) ?? [];
      dayEvents.push(event);
      grouped.set(dateKey, dayEvents);
    });

  return Array.from(grouped.entries()).map(([dateKey, dayEvents]) => ({
    dateKey,
    data: dayEvents,
  }));
}

export function resolveInitialAgendaSectionIndex(
  sections: AgendaSection[],
  now: Date
) {
  if (sections.length === 0) {
    return null;
  }

  const todayDateKey = formatLocalDateKey(now);
  const todaySectionIndex = sections.findIndex(
    (section) => section.dateKey === todayDateKey
  );

  if (
    todaySectionIndex >= 0 &&
    hasUpcomingEventInSection(sections[todaySectionIndex]!, now)
  ) {
    return todaySectionIndex;
  }

  const nextUpcomingSectionIndex = sections.findIndex((section) =>
    hasUpcomingEventInSection(section, now)
  );
  if (nextUpcomingSectionIndex >= 0) {
    return nextUpcomingSectionIndex;
  }

  if (todaySectionIndex >= 0) {
    return todaySectionIndex;
  }

  return 0;
}

export function CalendarAgendaList({
  events,
  selectedDate,
  onPressEvent,
  header,
  emptyState,
  refreshing = false,
  onRefresh,
  topInset = 0,
  bottomInset = 0,
  monthStart = null,
}: CalendarAgendaListProps) {
  const { tokens } = useAppTheme();
  const listRef = useRef<SectionList<MobileCalendarEvent, AgendaSection> | null>(
    null
  );
  const initialMonthStartRef = useRef(resolveMonthStartKey(new Date()));
  const hasAutoScrolledRef = useRef(false);

  const sections = useMemo<AgendaSection[]>(
    () => buildAgendaSections(events),
    [events]
  );
  const initialScrollTargetSectionIndex = useMemo(() => {
    if (hasAutoScrolledRef.current) {
      return null;
    }

    if (!monthStart || monthStart !== initialMonthStartRef.current) {
      return null;
    }

    return resolveInitialAgendaSectionIndex(sections, new Date());
  }, [monthStart, sections]);

  const scrollToInitialSection = useCallback(() => {
    if (hasAutoScrolledRef.current || initialScrollTargetSectionIndex == null) {
      return;
    }

    if (!listRef.current || typeof listRef.current.scrollToLocation !== 'function') {
      return;
    }

    listRef.current.scrollToLocation({
      sectionIndex: initialScrollTargetSectionIndex,
      itemIndex: 0,
      animated: false,
      viewOffset: 0,
    });
    hasAutoScrolledRef.current = true;
  }, [initialScrollTargetSectionIndex]);

  const handleInitialScrollFailure = useCallback(() => {
    if (hasAutoScrolledRef.current) {
      return;
    }

    setTimeout(() => {
      scrollToInitialSection();
    }, 32);
  }, [scrollToInitialSection]);

  return (
    <SectionList
      ref={listRef}
      testID="calendar-agenda-list"
      accessibilityLabel="Calendar agenda"
      sections={sections}
      keyExtractor={(item) => item.id}
      stickySectionHeadersEnabled
      showsVerticalScrollIndicator={false}
      style={[
        styles.list,
        {
          backgroundColor: tokens.colors.discoverShell,
          marginTop: topInset,
        },
      ]}
      contentContainerStyle={{
        paddingBottom: bottomInset,
      }}
      onContentSizeChange={scrollToInitialSection}
      onScrollToIndexFailed={handleInitialScrollFailure}
      ListHeaderComponent={
        header ? (
          <View style={styles.headerWrap}>
            <View style={styles.contentInner}>{header}</View>
          </View>
        ) : null
      }
      ListEmptyComponent={
        emptyState ? (
          <View style={styles.emptyWrap}>
            <View style={styles.contentInner}>{emptyState}</View>
          </View>
        ) : null
      }
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={tokens.colors.accent}
          />
        ) : undefined
      }
      renderSectionHeader={({ section }) => {
        const isSelectedDay = section.dateKey === selectedDate;

        return (
          <View pointerEvents="none" style={styles.sectionHeaderWrap}>
            <View style={styles.contentInner}>
              <View style={styles.sectionHeaderInner}>
                <View
                  style={[
                    styles.dayRail,
                    {
                      backgroundColor: tokens.colors.discoverShell,
                      borderRightColor: tokens.colors.discoverToolbarBorder,
                    },
                  ]}
                >
                  <Text
                    testID={`calendar-agenda-weekday-${section.dateKey}`}
                    style={{
                      color: tokens.colors.danger,
                      fontFamily: tokens.typography.sans,
                      fontSize: 10,
                      fontWeight: '800',
                      letterSpacing: 0.3,
                      textTransform: 'uppercase',
                    }}
                  >
                    {formatWeekdayLabel(section.dateKey)}
                  </Text>
                  <Text
                    style={{
                      color: tokens.colors.textPrimary,
                      fontFamily: tokens.typography.sans,
                      fontSize: 23,
                      fontWeight: isSelectedDay ? '800' : '400',
                    }}
                  >
                    {formatDayNumber(section.dateKey)}
                  </Text>
                </View>
                <View style={styles.sectionHeaderSpacer} />
              </View>
            </View>
          </View>
        );
      }}
      renderItem={({ item, index, section }) => {
        const accentColor = resolveEventAccentColor(item, tokens.colors);

        return (
          <View style={styles.itemWrap}>
            <View style={styles.contentInner}>
              <View style={styles.eventRowWrap}>
                <View
                  style={[
                    styles.rowRailSpacer,
                    {
                      borderRightColor: tokens.colors.discoverToolbarBorder,
                    },
                  ]}
                />

                <Pressable
                  onPress={() => onPressEvent(item.id)}
                  style={({ pressed }) => [
                    styles.eventRow,
                    {
                      backgroundColor: pressed
                        ? tokens.colors.accentSoft
                        : 'transparent',
                      borderBottomColor:
                        index < section.data.length - 1
                          ? tokens.colors.discoverToolbarBorder
                          : 'transparent',
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  <View style={styles.timeColumn}>
                    <Text
                      numberOfLines={1}
                      testID={`calendar-agenda-time-${item.id}`}
                      style={{
                        color: tokens.colors.discoverTextMuted,
                        fontFamily: tokens.typography.mono,
                        fontSize: 10,
                        fontWeight: '600',
                      }}
                    >
                      {formatEventStartTimeLabel(
                        item.startTime,
                        item.endTime,
                        item.timezone
                      )}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.eventAccent,
                      {
                        backgroundColor: accentColor ?? 'transparent',
                        opacity: accentColor ? 1 : 0,
                      },
                    ]}
                  />

                  <View style={styles.eventCopy}>
                    <Text
                      numberOfLines={2}
                      style={{
                        color: tokens.colors.textPrimary,
                        fontFamily: tokens.typography.sans,
                        fontSize: 15,
                        fontWeight: '700',
                        lineHeight: 19,
                      }}
                    >
                      {item.title}
                    </Text>

                    {item.location || item.isFree ? (
                      <View style={styles.metaRow}>
                        {item.location ? (
                          <Text
                            numberOfLines={1}
                            style={{
                              color: tokens.colors.textTertiary,
                              fontFamily: tokens.typography.sans,
                              fontSize: 11,
                              fontWeight: '500',
                            }}
                          >
                            {item.location}
                          </Text>
                        ) : null}

                        {item.location && item.isFree ? (
                          <Text
                            style={{
                              color: tokens.colors.textTertiary,
                              fontFamily: tokens.typography.sans,
                              fontSize: 11,
                            }}
                          >
                            •
                          </Text>
                        ) : null}

                        {item.isFree ? (
                          <Text
                            style={{
                              color: tokens.colors.textTertiary,
                              fontFamily: tokens.typography.sans,
                              fontSize: 11,
                              fontWeight: '500',
                            }}
                          >
                            Free
                          </Text>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                </Pressable>
              </View>
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  headerWrap: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  emptyWrap: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  contentInner: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
  },
  sectionHeaderWrap: {
    paddingHorizontal: 16,
    paddingTop: 2,
  },
  sectionHeaderInner: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  dayRail: {
    width: RAIL_WIDTH,
    paddingTop: 8,
    paddingRight: 10,
    paddingBottom: 4,
    borderRightWidth: StyleSheet.hairlineWidth,
    alignItems: 'flex-end',
  },
  sectionHeaderSpacer: {
    flex: 1,
    marginLeft: RAIL_GAP,
  },
  itemWrap: {
    paddingHorizontal: 16,
  },
  eventRowWrap: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  rowRailSpacer: {
    width: RAIL_WIDTH,
    marginRight: RAIL_GAP,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  eventRow: {
    minHeight: 56,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    paddingLeft: 8,
    paddingRight: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  timeColumn: {
    width: 58,
    paddingTop: 3,
    alignItems: 'flex-end',
  },
  eventAccent: {
    width: 3,
    minHeight: 24,
    borderRadius: 999,
    marginTop: 2,
  },
  eventCopy: {
    flex: 1,
    gap: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
});
