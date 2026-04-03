import { useCallback, useMemo, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type {
  LocalCalendarDateKey,
  MobileCalendarFeed,
} from '@kurecal/domain';

import { CalendarMonthGrid } from '../../src/components/CalendarMonthGrid';
import { EventSummaryCard } from '../../src/components/EventSummaryCard';
import { ScreenStateView } from '../../src/components/ScreenStateView';
import {
  formatDayHeading,
  formatMonthLabel,
  groupCalendarEventsByDate,
  isDateInMonth,
  resolveCurrentMonthStartKey,
  resolveMonthStartKey,
  resolvePreferredSelectedDate,
  resolveTodayDateKey,
  shiftMonthKey,
} from '../../src/lib/calendarDateUtils';
import { loadMobileCalendarFeed } from '../../src/lib/mobileApi';

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export default function CalendarScreen() {
  const [monthStart, setMonthStart] = useState<LocalCalendarDateKey>(
    resolveCurrentMonthStartKey()
  );
  const [feed, setFeed] = useState<MobileCalendarFeed | null>(null);
  const [selectedDate, setSelectedDate] = useState<LocalCalendarDateKey | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedRef = useRef(false);

  const loadCalendar = useCallback(
    async (
      targetMonthStart: LocalCalendarDateKey,
      mode: 'initial' | 'refresh' = 'initial'
    ) => {
      if (mode === 'refresh') {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const nextFeed = await loadMobileCalendarFeed({
          monthStart: targetMonthStart,
        });

        setFeed(nextFeed);
        setSelectedDate((current) =>
          resolvePreferredSelectedDate(nextFeed, current)
        );
        setError(null);
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : 'Unable to load the mobile calendar'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      const mode = hasLoadedRef.current ? 'refresh' : 'initial';
      hasLoadedRef.current = true;
      void loadCalendar(monthStart, mode);
    }, [loadCalendar, monthStart])
  );

  const eventsByDate = useMemo(
    () => groupCalendarEventsByDate(feed?.events ?? []),
    [feed?.events]
  );
  const activeDate = selectedDate ?? feed?.month.monthStart ?? monthStart;
  const selectedEvents = activeDate ? eventsByDate.get(activeDate) ?? [] : [];

  function changeMonth(offset: number) {
    setMonthStart((current) => shiftMonthKey(current, offset));
  }

  function jumpToToday() {
    const today = resolveTodayDateKey();
    setSelectedDate(today);
    setMonthStart(resolveMonthStartKey(today));
  }

  function handleSelectDate(dateKey: LocalCalendarDateKey) {
    setSelectedDate(dateKey);

    const activeMonthStart = feed?.month.monthStart ?? monthStart;
    if (!isDateInMonth(dateKey, activeMonthStart)) {
      setMonthStart(resolveMonthStartKey(dateKey));
    }
  }

  if (loading && !feed) {
    return (
      <LinearGradient colors={['#04151f', '#031018', '#02060b']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.stateWrap}>
            <ScreenStateView
              mode="loading"
              title="Loading calendar"
              description="Building your month view from upcoming and tracked events."
            />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (error && !feed) {
    return (
      <LinearGradient colors={['#04151f', '#031018', '#02060b']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.stateWrap}>
            <ScreenStateView
              mode="error"
              title="Calendar unavailable"
              description={error}
              onRetry={() => {
                void loadCalendar(monthStart);
              }}
            />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const header = feed?.header ?? {
    eyebrow: 'Calendar',
    title: 'Plan your month',
    subtitle: 'A month-first view for your tracked and upcoming events',
  };
  const monthLabel = feed?.month.label ?? formatMonthLabel(monthStart);

  return (
    <LinearGradient colors={['#04151f', '#031018', '#02060b']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void loadCalendar(monthStart, 'refresh');
              }}
              tintColor="#2dd4bf"
            />
          }
        >
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>{header.eyebrow}</Text>
            <Text style={styles.title}>{header.title}</Text>
            <Text style={styles.subtitle}>{header.subtitle ?? monthLabel}</Text>
            <Text style={styles.monthLabel}>{monthLabel}</Text>
          </View>

          <View style={styles.metricsRow}>
            <MetricCard label="Events" value={feed?.metrics.totalCount ?? 0} />
            <MetricCard label="Saved" value={feed?.metrics.savedCount ?? 0} />
            <MetricCard
              label="Attending"
              value={feed?.metrics.attendingCount ?? 0}
            />
          </View>

          <View style={styles.navigationRow}>
            <Pressable
              onPress={() => changeMonth(-1)}
              style={({ pressed }) => [
                styles.secondaryAction,
                pressed ? styles.secondaryActionPressed : null,
              ]}
            >
              <Text style={styles.secondaryActionLabel}>Previous</Text>
            </Pressable>
            <Pressable
              onPress={jumpToToday}
              style={({ pressed }) => [
                styles.primaryAction,
                pressed ? styles.primaryActionPressed : null,
              ]}
            >
              <Text style={styles.primaryActionLabel}>Today</Text>
            </Pressable>
            <Pressable
              onPress={() => changeMonth(1)}
              style={({ pressed }) => [
                styles.secondaryAction,
                pressed ? styles.secondaryActionPressed : null,
              ]}
            >
              <Text style={styles.secondaryActionLabel}>Next</Text>
            </Pressable>
          </View>

          {error ? <Text style={styles.inlineError}>{error}</Text> : null}

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEyebrow}>Month view</Text>
              <Text style={styles.sectionTitle}>{monthLabel}</Text>
            </View>
            <CalendarMonthGrid
              days={feed?.days ?? []}
              selectedDate={activeDate}
              onSelectDate={handleSelectDate}
            />
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEyebrow}>Agenda</Text>
              <Text style={styles.sectionTitle}>
                {formatDayHeading(activeDate)}
              </Text>
            </View>

            {selectedEvents.length > 0 ? (
              <View style={styles.agendaStack}>
                {selectedEvents.map((event) => (
                  <EventSummaryCard
                    key={event.id}
                    event={event}
                    onPress={() =>
                      router.push({
                        pathname: '../event/[id]',
                        params: { id: event.id },
                      })
                    }
                  />
                ))}
              </View>
            ) : (
              <ScreenStateView
                mode="empty"
                title="No events on this day"
                description="Choose another day in the grid or explore Discover to save more events into your month."
              />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  agendaStack: {
    gap: 14,
  },
  content: {
    gap: 18,
    padding: 22,
  },
  eyebrow: {
    color: '#2dd4bf',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  gradient: {
    flex: 1,
  },
  hero: {
    gap: 10,
  },
  inlineError: {
    color: '#fca5a5',
    fontSize: 14,
    lineHeight: 20,
  },
  metricCard: {
    backgroundColor: 'rgba(7, 15, 23, 0.88)',
    borderColor: 'rgba(148, 163, 184, 0.12)',
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    padding: 16,
  },
  metricLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  metricValue: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '800',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  monthLabel: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
  },
  navigationRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: '#2dd4bf',
    borderRadius: 18,
    flex: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
  },
  primaryActionLabel: {
    color: '#042f2e',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryActionPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.992 }],
  },
  safeArea: {
    flex: 1,
  },
  secondaryAction: {
    alignItems: 'center',
    borderColor: 'rgba(148, 163, 184, 0.2)',
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
  },
  secondaryActionLabel: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryActionPressed: {
    opacity: 0.88,
  },
  section: {
    gap: 14,
  },
  sectionCard: {
    backgroundColor: 'rgba(7, 15, 23, 0.66)',
    borderColor: 'rgba(148, 163, 184, 0.1)',
    borderRadius: 28,
    borderWidth: 1,
    gap: 16,
    padding: 18,
  },
  sectionEyebrow: {
    color: '#2dd4bf',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sectionHeader: {
    gap: 6,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
  },
  stateWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: 22,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 15,
    lineHeight: 22,
  },
  title: {
    color: '#f8fafc',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
});
