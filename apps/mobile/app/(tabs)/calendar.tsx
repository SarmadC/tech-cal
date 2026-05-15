import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutAnimation,
  LayoutChangeEvent,
  Platform,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import { router } from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import type {
  LocalCalendarDateKey,
  MobileCalendarFeed,
  MobileCalendarFeedRequest,
} from "@kurecal/domain";

import { CalendarAgendaList } from "../../src/components/calendar/CalendarAgendaList";
import {
  CalendarFilterSheet,
  type CalendarDraftFilters,
} from "../../src/components/calendar/CalendarFilterSheet";
import { CalendarMonthGrid } from "../../src/components/calendar/CalendarMonthGrid";
import { CalendarQuickDatePicker } from "../../src/components/calendar/CalendarQuickDatePicker";
import { CalendarToolbar } from "../../src/components/calendar/CalendarToolbar";
import { ScreenState } from "../../src/components/chrome/ScreenState";
import { useAuth } from "../../src/context/AuthProvider";
import {
  formatLocalDateKey,
  formatMonthButtonLabel,
  resolveDateInMonth,
  resolveMonthStartKey,
  resolvePreferredSelectedDate,
  shiftMonthKey,
} from "../../src/lib/calendarDateUtils";
import {
  resolveCalendarRenderState,
  resolveCalendarSheetState,
} from "../../src/lib/calendarState";
import { loadMobileCalendarFeed } from "../../src/lib/mobileApi";
import { useAppTheme } from "../../src/providers/ThemeProvider";
import { useTabBarVisibility } from "../../src/components/chrome/TabBarVisibilityProvider";

const DEFAULT_FILTERS: CalendarDraftFilters = {
  tags: [],
  location: "",
  dateRange: {
    start: null,
    end: null,
  },
  cost: "all",
};

function resolveDefaultSelectedDate() {
  return formatLocalDateKey(new Date());
}

function resolveDefaultVisibleMonth() {
  return resolveMonthStartKey(new Date());
}

function buildRequest(
  monthStart: LocalCalendarDateKey,
  filters: CalendarDraftFilters,
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
  if (filters.cost !== "all") count += 1;

  return count;
}

export default function CalendarScreen() {
  const { profile } = useAuth();
  const { tokens } = useAppTheme();
  const { isVisible } = useTabBarVisibility();
  const insets = useSafeAreaInsets();
  const tabBarBottomInset = isVisible
    ? tokens.spacing.tabBarBottom
    : Math.max(insets.bottom + 20, 28);
  const [visibleMonthStart, setVisibleMonthStart] =
    useState<LocalCalendarDateKey>(() => resolveDefaultVisibleMonth());
  const [selectedDate, setSelectedDate] = useState<LocalCalendarDateKey | null>(
    () => resolveDefaultSelectedDate(),
  );
  const [isCalendarCollapsed, setIsCalendarCollapsed] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [headerHeight, setHeaderHeight] = useState<number | null>(null);
  const [filters, setFilters] = useState<CalendarDraftFilters>(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] =
    useState<CalendarDraftFilters>(DEFAULT_FILTERS);
  const [feed, setFeed] = useState<MobileCalendarFeed | null>(null);
  const [previewFeed, setPreviewFeed] = useState<MobileCalendarFeed | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const requestSequenceRef = useRef(0);

  useEffect(() => {
    if (
      Platform.OS === "android" &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const appliedRequest = useMemo(
    () => buildRequest(visibleMonthStart, filters),
    [filters, visibleMonthStart],
  );
  const previewRequest = useMemo(
    () => buildRequest(visibleMonthStart, draftFilters),
    [draftFilters, visibleMonthStart],
  );

  async function runCalendarRequest(
    request: MobileCalendarFeedRequest,
    mode: "initial" | "refresh" = "initial",
  ) {
    const requestSequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestSequence;

    if (mode === "refresh") {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const nextFeed = await loadMobileCalendarFeed(request);

      if (requestSequence !== requestSequenceRef.current) {
        return;
      }

      setFeed(nextFeed);
      setSelectedDate((current) =>
        resolvePreferredSelectedDate(nextFeed, current),
      );
      setError(null);
    } catch (nextError) {
      if (requestSequence !== requestSequenceRef.current) {
        return;
      }

      setError(
        nextError instanceof Error
          ? nextError.message
          : "Unable to load calendar",
      );
    } finally {
      if (requestSequence !== requestSequenceRef.current) {
        return;
      }

      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void runCalendarRequest(appliedRequest);
  }, [appliedRequest]);

  useEffect(() => {
    if (!isFilterOpen) {
      setPreviewFeed(null);
      setPreviewError(null);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);

    void loadMobileCalendarFeed(previewRequest)
      .then((nextFeed) => {
        if (cancelled) {
          return;
        }

        setPreviewFeed(nextFeed);
        setPreviewError(null);
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }

        setPreviewFeed(null);
        setPreviewError(
          nextError instanceof Error
            ? nextError.message
            : "Unable to preview calendar",
        );
      })
      .finally(() => {
        if (!cancelled) {
          setPreviewLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isFilterOpen, previewRequest]);

  const { activeSheetFeed, disableApply, previewResultCount } = useMemo(
    () =>
      resolveCalendarSheetState({
        feed,
        previewFeed,
        previewError,
      }),
    [feed, previewError, previewFeed],
  );
  const { inlineError, showAgenda, showFatalError, showInitialLoading } =
    useMemo(
      () =>
        resolveCalendarRenderState({
          error,
          feed,
          loading,
        }),
      [error, feed, loading],
    );
  const activeFilterCount = countActiveFilters(filters);
  const draftActiveFilterCount = countActiveFilters(draftFilters);
  const eventTypeColors = useMemo(
    () =>
      Object.fromEntries(
        (feed?.availableFilters.eventTypes ?? []).map((eventType) => [
          eventType.id,
          eventType.color,
        ]),
      ),
    [feed?.availableFilters.eventTypes],
  );
  const headerOffset = (headerHeight ?? insets.top + 80) + 6;
  const agendaHeader =
    inlineError || !isCalendarCollapsed ? (
      <View style={styles.agendaHeaderStack}>
        {inlineError ? (
          <View
            style={[
              styles.inlineErrorBanner,
              {
                backgroundColor: tokens.colors.discoverToolbar,
                borderColor: tokens.colors.warning,
              },
            ]}
          >
            <View style={styles.inlineErrorCopy}>
              <View
                style={[
                  styles.inlineErrorDot,
                  { backgroundColor: tokens.colors.warning },
                ]}
              />
              <View style={styles.inlineErrorTextWrap}>
                <Text
                  style={[
                    styles.inlineErrorTitle,
                    {
                      color: tokens.colors.textPrimary,
                      fontFamily: tokens.typography.sans,
                    },
                  ]}
                >
                  Calendar refresh failed
                </Text>
                <Text
                  style={[
                    styles.inlineErrorDescription,
                    {
                      color: tokens.colors.discoverTextSoft,
                      fontFamily: tokens.typography.sans,
                    },
                  ]}
                >
                  {inlineError}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {!isCalendarCollapsed ? (
          <CalendarMonthGrid
            monthStart={feed?.month.monthStart ?? visibleMonthStart}
            selectedDate={selectedDate}
            events={feed?.events ?? []}
            eventTypeColors={eventTypeColors}
            onSelectDate={selectDate}
            onJumpToDate={jumpToDate}
            onChangeMonth={changeVisibleMonth}
          />
        ) : null}
      </View>
    ) : null;

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

  function jumpToDate(dateKey: LocalCalendarDateKey) {
    const nextMonthStart = resolveMonthStartKey(dateKey);
    setVisibleMonthStart(nextMonthStart);
    setSelectedDate(dateKey);
    setIsCalendarCollapsed(true);
  }

  function selectDate(dateKey: LocalCalendarDateKey) {
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
        style={[
          styles.safeArea,
          { backgroundColor: tokens.colors.discoverShell },
        ]}
        edges={["left", "right"]}
      >
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: tokens.colors.discoverShell },
          ]}
        />

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
              monthLabel={formatMonthButtonLabel(
                feed?.month.monthStart ?? visibleMonthStart,
              )}
              isCollapsed={isCalendarCollapsed}
              activeFilterCount={activeFilterCount}
              onToggleCalendar={toggleCalendarCollapse}
              onOpenMonthPicker={() => setIsMonthPickerOpen(true)}
              onOpenFilters={openFilters}
            />
          </View>
        </View>

        {showInitialLoading ? (
          <View
            style={[
              styles.stateWrap,
              {
                marginTop: headerOffset,
                paddingBottom: tabBarBottomInset,
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

        {showFatalError ? (
          <View
            style={[
              styles.stateWrap,
              {
                marginTop: headerOffset,
                paddingBottom: tabBarBottomInset,
              },
            ]}
          >
            <View style={styles.stateInner}>
              <ScreenState
                mode="error"
                title="Calendar unavailable"
                description={error ?? undefined}
                variant="discover"
              />
            </View>
          </View>
        ) : null}

        {showAgenda ? (
          <CalendarAgendaList
            events={feed?.events ?? []}
            monthStart={feed?.month.monthStart ?? visibleMonthStart}
            selectedDate={selectedDate}
            onPressEvent={(eventId) => router.push(`/event/${eventId}`)}
            header={agendaHeader}
            emptyState={
              feed ? (
                <ScreenState
                  mode="empty"
                  title={feed.emptyState.title}
                  description={
                    feed.emptyState.body ??
                    feed.emptyState.description ??
                    "Try another month."
                  }
                  variant="discover"
                />
              ) : null
            }
            refreshing={refreshing}
            onRefresh={() => {
              void runCalendarRequest(appliedRequest, "refresh");
            }}
            topInset={headerOffset}
            bottomInset={tabBarBottomInset}
          />
        ) : null}
      </SafeAreaView>

      <CalendarFilterSheet
        visible={isFilterOpen}
        value={draftFilters}
        tags={activeSheetFeed?.availableFilters.tags ?? []}
        counts={
          activeSheetFeed?.counts ?? {
            cost: {
              free: 0,
              paid: 0,
            },
            tags: {},
          }
        }
        resultCount={previewResultCount}
        activeFilterCount={draftActiveFilterCount}
        profileTimezone={profile?.profile.timezone ?? null}
        isPreviewLoading={previewLoading}
        previewError={previewError}
        disableApply={disableApply}
        onChange={setDraftFilters}
        onApply={applyFilters}
        onClose={() => setIsFilterOpen(false)}
        onReset={resetFilters}
      />

      <CalendarQuickDatePicker
        mode="single"
        visible={isMonthPickerOpen}
        value={selectedDate}
        onApply={(dateKey) =>
          jumpToDate(dateKey ?? resolveDefaultSelectedDate())
        }
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
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerInner: {
    width: "100%",
    maxWidth: 430,
    alignSelf: "center",
  },
  stateWrap: {
    flex: 1,
    paddingHorizontal: 16,
  },
  stateInner: {
    width: "100%",
    maxWidth: 430,
    alignSelf: "center",
  },
  agendaHeaderStack: {
    gap: 8,
  },
  inlineErrorBanner: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  inlineErrorCopy: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  inlineErrorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  inlineErrorTextWrap: {
    flex: 1,
    gap: 4,
  },
  inlineErrorTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  inlineErrorDescription: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
});
