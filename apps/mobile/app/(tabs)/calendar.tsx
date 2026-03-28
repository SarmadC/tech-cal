import { startTransition, useEffect, useMemo, useState } from 'react';
import {
  LayoutAnimation,
  LayoutChangeEvent,
  Platform,
  StyleSheet,
  UIManager,
  View,
} from 'react-native';
import type {
  MobileCalendarFeedRequest,
} from '@kurecal/domain';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenState } from '@/components/chrome/ScreenState';
import { CalendarAgendaList } from '@/components/calendar/CalendarAgendaList';
import {
  CalendarFilterSheet,
  type CalendarDraftFilters,
} from '@/components/calendar/CalendarFilterSheet';
import { CalendarMonthGrid } from '@/components/calendar/CalendarMonthGrid';
import { CalendarQuickDatePicker } from '@/components/calendar/CalendarQuickDatePicker';
import { CalendarToolbar } from '@/components/calendar/CalendarToolbar';
import { formatLocalDateKey, formatMonthButtonLabel, resolveDateInMonth, resolveMonthStartKey, shiftMonthKey } from '@/components/calendar/calendarDateUtils';
import { useMobileAuth } from '@/hooks/useMobileAuth';
import { getMobileApiClient } from '@/lib/mobileApi';
import { mobileQueryKeys } from '@/lib/queryKeys';
import { mobileQueryStaleTimes } from '@/lib/queryClient';
import { useAppTheme } from '@/providers/ThemeProvider';

const DEFAULT_FILTERS: CalendarDraftFilters = {
  tags: [],
  location: '',
  dateRange: {
    start: null,
    end: null,
  },
  cost: 'all',
};

function resolveDefaultSelectedDate() {
  return formatLocalDateKey(new Date());
}

function resolveDefaultVisibleMonth() {
  return resolveMonthStartKey(new Date());
}

function buildRequest(
  monthStart: string,
  filters: CalendarDraftFilters
): MobileCalendarFeedRequest {
  return {
    monthStart,
    tags: filters.tags,
    location: filters.location.trim() || null,
    dateRange: filters.dateRange,
    cost: filters.cost,
  };
}

function cloneFilters(filters: CalendarDraftFilters): CalendarDraftFilters {
  return {
    tags: [...filters.tags],
    location: filters.location,
    dateRange: {
      start: filters.dateRange.start,
      end: filters.dateRange.end,
    },
    cost: filters.cost,
  };
}

function countActiveFilters(filters: CalendarDraftFilters) {
  let count = 0;

  if (filters.tags.length > 0) count += 1;
  if (filters.location.trim()) count += 1;
  if (filters.dateRange.start || filters.dateRange.end) count += 1;
  if (filters.cost !== 'all') count += 1;

  return count;
}

export default function CalendarScreen() {
  const { profile } = useMobileAuth();
  const { tokens } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [visibleMonthStart, setVisibleMonthStart] = useState(() => resolveDefaultVisibleMonth());
  const [selectedDate, setSelectedDate] = useState(() => resolveDefaultSelectedDate());
  const [isCalendarCollapsed, setIsCalendarCollapsed] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [headerHeight, setHeaderHeight] = useState<number | null>(null);
  const [filters, setFilters] = useState<CalendarDraftFilters>(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState<CalendarDraftFilters>(DEFAULT_FILTERS);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const appliedRequest = useMemo(
    () => buildRequest(visibleMonthStart, filters),
    [filters, visibleMonthStart]
  );
  const previewRequest = useMemo(
    () => buildRequest(visibleMonthStart, draftFilters),
    [draftFilters, visibleMonthStart]
  );

  const calendarQuery = useQuery({
    queryKey: mobileQueryKeys.calendar.feed(appliedRequest),
    staleTime: mobileQueryStaleTimes.short,
    queryFn: async () => {
      const result = await getMobileApiClient().getCalendarFeed(appliedRequest);
      if (!result.success) {
        throw new Error(result.error ?? 'Unable to load calendar');
      }
      return result.data;
    },
  });

  const previewQuery = useQuery({
    queryKey: mobileQueryKeys.calendar.preview(previewRequest),
    enabled: isFilterOpen,
    staleTime: mobileQueryStaleTimes.live,
    queryFn: async () => {
      const result = await getMobileApiClient().getCalendarFeed(previewRequest);
      if (!result.success) {
        throw new Error(result.error ?? 'Unable to preview calendar');
      }
      return result.data;
    },
  });

  const feed = calendarQuery.data;
  const previewFeed = previewQuery.data;
  const activeSheetFeed = previewFeed ?? feed;
  const activeFilterCount = countActiveFilters(filters);
  const draftActiveFilterCount = countActiveFilters(draftFilters);
  const previewResultCount = activeSheetFeed?.results.totalCount ?? feed?.results.totalCount ?? 0;
  const eventTypeColors = useMemo(
    () =>
      Object.fromEntries(
        (feed?.availableFilters.eventTypes ?? []).map((eventType) => [eventType.id, eventType.color])
      ),
    [feed?.availableFilters.eventTypes]
  );
  const headerOffset = (headerHeight ?? insets.top + 80) + 6;

  function toggleCalendarCollapse() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsCalendarCollapsed((current) => !current);
  }

  function handleHeaderLayout(event: LayoutChangeEvent) {
    const nextHeight = event.nativeEvent.layout.height;

    if (Math.abs((headerHeight ?? 0) - nextHeight) > 1) {
      setHeaderHeight(nextHeight);
    }
  }

  function changeVisibleMonth(offset: number) {
    const nextMonthStart = shiftMonthKey(visibleMonthStart, offset);
    setVisibleMonthStart(nextMonthStart);
    setSelectedDate((current) => resolveDateInMonth(current, nextMonthStart));
  }

  function jumpToDate(dateKey: string) {
    const nextMonthStart = resolveMonthStartKey(dateKey);
    setVisibleMonthStart(nextMonthStart);
    setSelectedDate(dateKey);
    setIsCalendarCollapsed(true);
  }

  function selectDate(dateKey: string) {
    setSelectedDate(dateKey);
  }

  function openFilters() {
    setDraftFilters(cloneFilters(filters));
    setIsFilterOpen(true);
  }

  function resetFilters() {
    startTransition(() => {
      setFilters(DEFAULT_FILTERS);
      setDraftFilters(DEFAULT_FILTERS);
    });
  }

  function applyFilters() {
    startTransition(() => {
      setFilters({
        ...draftFilters,
        location: draftFilters.location.trim(),
      });
    });
    setIsFilterOpen(false);
  }

  return (
    <>
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: tokens.colors.discoverShell }]}
        edges={['left', 'right']}
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: tokens.colors.discoverShell }]} />

        <View
          onLayout={handleHeaderLayout}
          style={[
            styles.headerWrap,
            {
              backgroundColor: tokens.colors.discoverHeader,
              borderBottomColor: tokens.colors.discoverToolbarBorderStrong,
              paddingTop: insets.top + 8,
              paddingBottom: 8,
            },
          ]}
        >
          <View style={styles.headerInner}>
            <CalendarToolbar
              monthLabel={formatMonthButtonLabel(feed?.month.monthStart ?? visibleMonthStart)}
              isCollapsed={isCalendarCollapsed}
              activeFilterCount={activeFilterCount}
              onToggleCalendar={toggleCalendarCollapse}
              onOpenMonthPicker={() => setIsMonthPickerOpen(true)}
              onOpenFilters={openFilters}
            />
          </View>
        </View>

        {calendarQuery.isLoading && !feed ? (
          <View
            style={[
              styles.stateWrap,
              {
                marginTop: headerOffset,
                paddingBottom: tokens.spacing.tabBarBottom,
              },
            ]}
          >
            <View style={styles.stateInner}>
              <ScreenState
                mode="loading"
                title="Loading calendar"
                description="Preparing the month view and agenda."
                variant="plain"
                fullHeight
              />
            </View>
          </View>
        ) : null}

        {calendarQuery.isError ? (
          <View
            style={[
              styles.stateWrap,
              {
                marginTop: headerOffset,
                paddingBottom: tokens.spacing.tabBarBottom,
              },
            ]}
          >
            <View style={styles.stateInner}>
              <ScreenState
                mode="error"
                title="Calendar unavailable"
                description={
                  calendarQuery.error instanceof Error
                    ? calendarQuery.error.message
                    : 'Try again in a moment.'
                }
                variant="discover"
              />
            </View>
          </View>
        ) : null}

        {!calendarQuery.isLoading && !calendarQuery.isError ? (
          <CalendarAgendaList
            events={feed?.events ?? []}
            monthStart={feed?.month.monthStart ?? visibleMonthStart}
            selectedDate={selectedDate}
            onPressEvent={(eventId) => router.push(`/event/${eventId}`)}
            header={
              !isCalendarCollapsed ? (
                <CalendarMonthGrid
                  monthStart={feed?.month.monthStart ?? visibleMonthStart}
                  selectedDate={selectedDate}
                  events={feed?.events ?? []}
                  eventTypeColors={eventTypeColors}
                  onSelectDate={selectDate}
                  onJumpToDate={jumpToDate}
                  onChangeMonth={changeVisibleMonth}
                />
              ) : null
            }
            emptyState={
              feed ? (
                <ScreenState
                  mode="empty"
                  title={feed.emptyState.title}
                  description={feed.emptyState.body}
                  variant="discover"
                />
              ) : null
            }
            refreshing={calendarQuery.isRefetching && !calendarQuery.isLoading}
            onRefresh={() => {
              void calendarQuery.refetch();
            }}
            topInset={headerOffset}
            bottomInset={tokens.spacing.tabBarBottom}
          />
        ) : null}
      </SafeAreaView>

      <CalendarFilterSheet
        visible={isFilterOpen}
        value={draftFilters}
        tags={activeSheetFeed?.availableFilters.tags ?? []}
        counts={activeSheetFeed?.counts ?? {
          cost: {
            free: 0,
            paid: 0,
          },
          tags: {},
        }}
        resultCount={previewResultCount}
        activeFilterCount={draftActiveFilterCount}
        profileTimezone={profile?.timezone ?? null}
        isPreviewLoading={previewQuery.isFetching}
        onChange={setDraftFilters}
        onApply={applyFilters}
        onClose={() => setIsFilterOpen(false)}
        onReset={resetFilters}
      />

      <CalendarQuickDatePicker
        mode="single"
        visible={isMonthPickerOpen}
        value={selectedDate}
        onApply={(dateKey) => jumpToDate(dateKey ?? resolveDefaultSelectedDate())}
        onClose={() => setIsMonthPickerOpen(false)}
        title="Jump to date"
        applyLabel="Go to date"
        clearLabel="Today"
      />
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerInner: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
  },
  stateWrap: {
    flex: 1,
    paddingHorizontal: 16,
  },
  stateInner: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
  },
});
