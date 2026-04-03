import { startTransition, useEffect, useMemo, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { MobileDiscoverFeed, MobileDiscoverFeedRequest } from '@kurecal/domain';

import { EventSummaryCard } from '../../src/components/EventSummaryCard';
import { ScreenStateView } from '../../src/components/ScreenStateView';
import { loadMobileDiscoverFeed } from '../../src/lib/mobileApi';

interface DiscoverDraftState {
  dateFrom: string;
  dateTo: string;
  location: string;
  searchTerm: string;
  tagsInput: string;
}

const DEFAULT_DRAFT: DiscoverDraftState = {
  dateFrom: '',
  dateTo: '',
  location: '',
  searchTerm: '',
  tagsInput: '',
};

function parseTags(tagsInput: string): string[] {
  return Array.from(
    new Set(
      tagsInput
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

function buildRequest(
  draft: DiscoverDraftState,
  page = 1
): MobileDiscoverFeedRequest {
  return {
    searchTerm: draft.searchTerm.trim() || undefined,
    tags: parseTags(draft.tagsInput),
    location: draft.location.trim() || null,
    dateFrom: draft.dateFrom.trim() || null,
    dateTo: draft.dateTo.trim() || null,
    page,
  };
}

function countActiveFilters(request: MobileDiscoverFeedRequest) {
  let count = 0;

  if (request.searchTerm?.trim()) count += 1;
  if (request.tags?.length) count += 1;
  if (request.location?.trim()) count += 1;
  if (request.dateFrom || request.dateTo) count += 1;

  return count;
}

export default function DiscoverScreen() {
  const [draft, setDraft] = useState<DiscoverDraftState>(DEFAULT_DRAFT);
  const [feed, setFeed] = useState<MobileDiscoverFeed | null>(null);
  const [events, setEvents] = useState<MobileDiscoverFeed['events']>([]);
  const [activeRequest, setActiveRequest] = useState<MobileDiscoverFeedRequest>({
    page: 1,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const activeFilterCount = useMemo(
    () => countActiveFilters(activeRequest),
    [activeRequest]
  );

  async function runDiscoverRequest(
    request: MobileDiscoverFeedRequest,
    mode: 'initial' | 'more' | 'refresh' = 'initial'
  ) {
    if (mode === 'more') {
      setLoadingMore(true);
    } else if (mode === 'refresh') {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const nextFeed = await loadMobileDiscoverFeed(request);
      setFeed(nextFeed);
      setEvents((current) =>
        mode === 'more' ? [...current, ...nextFeed.events] : nextFeed.events
      );
      setError(null);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to load discover feed'
      );
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const initialRequest = buildRequest(DEFAULT_DRAFT, 1);
    setActiveRequest(initialRequest);
    void runDiscoverRequest(initialRequest);
  }, []);

  function applyFilters() {
    const nextRequest = buildRequest(draft, 1);
    startTransition(() => {
      setActiveRequest(nextRequest);
    });
    void runDiscoverRequest(nextRequest);
  }

  function clearFilters() {
    startTransition(() => {
      setDraft(DEFAULT_DRAFT);
    });

    const nextRequest = buildRequest(DEFAULT_DRAFT, 1);
    startTransition(() => {
      setActiveRequest(nextRequest);
    });
    void runDiscoverRequest(nextRequest);
  }

  function loadMore() {
    if (!feed?.nextPage || loadingMore) {
      return;
    }

    const nextRequest = {
      ...activeRequest,
      page: feed.nextPage,
    };

    startTransition(() => {
      setActiveRequest(nextRequest);
    });
    void runDiscoverRequest(nextRequest, 'more');
  }

  const header = feed?.header ?? {
    eyebrow: 'Discover',
    title: 'Find your next event',
    subtitle: 'Search the upcoming event catalog',
  };

  if (loading && events.length === 0) {
    return (
      <LinearGradient colors={['#04151f', '#031018', '#02060b']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.stateWrap}>
            <ScreenStateView
              mode="loading"
              title="Loading discover"
              description="Pulling upcoming events for the new mobile feed."
            />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (error && events.length === 0) {
    return (
      <LinearGradient colors={['#04151f', '#031018', '#02060b']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.stateWrap}>
            <ScreenStateView
              mode="error"
              title="Discover unavailable"
              description={error}
              onRetry={() => {
                void runDiscoverRequest(activeRequest);
              }}
            />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#04151f', '#031018', '#02060b']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void runDiscoverRequest(activeRequest, 'refresh');
              }}
              tintColor="#2dd4bf"
            />
          }
        >
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>{header.eyebrow}</Text>
            <Text style={styles.title}>{header.title}</Text>
            {header.subtitle ? (
              <Text style={styles.subtitle}>{header.subtitle}</Text>
            ) : null}
          </View>

          <View style={styles.filterPanel}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Filter the feed</Text>
              <Text style={styles.filterMeta}>
                {activeFilterCount} active · {feed?.totalCount ?? events.length} result
                {(feed?.totalCount ?? events.length) === 1 ? '' : 's'}
              </Text>
            </View>

            <TextInput
              onChangeText={(value) =>
                setDraft((current) => ({ ...current, searchTerm: value }))
              }
              placeholder="Search by title or keyword"
              placeholderTextColor="#64748b"
              style={styles.input}
              value={draft.searchTerm}
            />

            <View style={styles.row}>
              <TextInput
                onChangeText={(value) =>
                  setDraft((current) => ({ ...current, location: value }))
                }
                placeholder="Location"
                placeholderTextColor="#64748b"
                style={[styles.input, styles.rowInput]}
                value={draft.location}
              />
              <TextInput
                onChangeText={(value) =>
                  setDraft((current) => ({ ...current, tagsInput: value }))
                }
                placeholder="Tags (comma separated)"
                placeholderTextColor="#64748b"
                style={[styles.input, styles.rowInput]}
                value={draft.tagsInput}
              />
            </View>

            <View style={styles.row}>
              <TextInput
                autoCapitalize="none"
                onChangeText={(value) =>
                  setDraft((current) => ({ ...current, dateFrom: value }))
                }
                placeholder="From YYYY-MM-DD"
                placeholderTextColor="#64748b"
                style={[styles.input, styles.rowInput]}
                value={draft.dateFrom}
              />
              <TextInput
                autoCapitalize="none"
                onChangeText={(value) =>
                  setDraft((current) => ({ ...current, dateTo: value }))
                }
                placeholder="To YYYY-MM-DD"
                placeholderTextColor="#64748b"
                style={[styles.input, styles.rowInput]}
                value={draft.dateTo}
              />
            </View>

            <View style={styles.actionRow}>
              <Pressable
                onPress={applyFilters}
                style={({ pressed }) => [
                  styles.primaryAction,
                  pressed ? styles.primaryActionPressed : null,
                ]}
              >
                <Text style={styles.primaryActionLabel}>Apply filters</Text>
              </Pressable>
              <Pressable
                onPress={clearFilters}
                style={({ pressed }) => [
                  styles.secondaryAction,
                  pressed ? styles.secondaryActionPressed : null,
                ]}
              >
                <Text style={styles.secondaryActionLabel}>Reset</Text>
              </Pressable>
            </View>
          </View>

          {error ? <Text style={styles.inlineError}>{error}</Text> : null}

          <View style={styles.results}>
            {events.length > 0 ? (
              events.map((event) => (
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
              ))
            ) : (
              <ScreenStateView
                mode="empty"
                title="No events match yet"
                description="Try widening the date range or removing a filter to see more of the catalog."
              />
            )}
          </View>

          {feed?.nextPage ? (
            <Pressable
              onPress={loadMore}
              style={({ pressed }) => [
                styles.loadMoreButton,
                pressed ? styles.loadMorePressed : null,
              ]}
            >
              <Text style={styles.loadMoreLabel}>
                {loadingMore ? 'Loading more…' : 'Load more events'}
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    gap: 12,
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
  filterHeader: {
    gap: 4,
  },
  filterMeta: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  filterPanel: {
    backgroundColor: 'rgba(7, 15, 23, 0.88)',
    borderColor: 'rgba(148, 163, 184, 0.12)',
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  filterTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
  },
  gradient: {
    flex: 1,
  },
  hero: {
    gap: 10,
  },
  inlineError: {
    color: '#fda4af',
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'rgba(2, 6, 11, 0.52)',
    borderColor: 'rgba(148, 163, 184, 0.16)',
    borderRadius: 16,
    borderWidth: 1,
    color: '#f8fafc',
    fontSize: 15,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  loadMoreButton: {
    alignItems: 'center',
    borderColor: 'rgba(45, 212, 191, 0.32)',
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 18,
  },
  loadMoreLabel: {
    color: '#99f6e4',
    fontSize: 14,
    fontWeight: '700',
  },
  loadMorePressed: {
    opacity: 0.92,
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
  results: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowInput: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  secondaryAction: {
    alignItems: 'center',
    borderColor: 'rgba(148, 163, 184, 0.24)',
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
  },
  secondaryActionLabel: {
    color: '#dbeafe',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryActionPressed: {
    opacity: 0.92,
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
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.9,
    lineHeight: 36,
  },
});
