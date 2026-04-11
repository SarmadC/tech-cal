import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type {
  MobileDiscoverFeed,
  MobileDiscoverFeedRequest,
  MobileDiscoverRankingMode,
} from '@kurecal/domain';

import { ScreenState } from '../../src/components/chrome/ScreenState';
import { DiscoverChipRail, type DiscoverChip } from '../../src/components/discover/DiscoverChipRail';
import { DiscoverEventCard } from '../../src/components/discover/DiscoverEventCard';
import {
  DiscoverFilterSheet,
  type DiscoverDraftFilters,
} from '../../src/components/discover/DiscoverFilterSheet';
import { DiscoverRankingRail } from '../../src/components/discover/DiscoverRankingRail';
import { DiscoverSearchBar } from '../../src/components/discover/DiscoverSearchBar';
import { DiscoverShell } from '../../src/components/discover/DiscoverShell';
import { DiscoverTopPicksSection } from '../../src/components/discover/DiscoverTopPicksSection';
import { useAuth } from '../../src/context/AuthProvider';
import { mergeDiscoverFeedPage } from '../../src/lib/discoverState';
import { loadMobileDiscoverFeed } from '../../src/lib/mobileApi';
import { useAppTheme } from '../../src/providers/ThemeProvider';

const DEFAULT_RANKING_MODE: MobileDiscoverRankingMode = 'best-match';

const DEFAULT_FILTERS: DiscoverDraftFilters = {
  tags: [],
  location: '',
  dateRange: {
    start: null,
    end: null,
  },
  cost: 'all',
};

const FALLBACK_RANKING_OPTIONS = [
  {
    id: 'best-match' as const,
    label: 'Best match',
    description: 'Prioritize strongest career alignment.',
  },
  {
    id: 'trending' as const,
    label: 'Trending',
    description: 'Prioritize momentum and attendance.',
  },
  {
    id: 'soonest' as const,
    label: 'Soonest',
    description: 'Ordered by upcoming start time.',
  },
];

function formatDateLabel(value: string | null) {
  if (!value) {
    return '';
  }

  return new Date(`${value}T12:00:00.000Z`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function buildDateRangeLabel(start: string | null, end: string | null) {
  if (!start && !end) {
    return '';
  }

  if (start && end) {
    return `${formatDateLabel(start)} - ${formatDateLabel(end)}`;
  }

  if (start) {
    return `From ${formatDateLabel(start)}`;
  }

  return `Until ${formatDateLabel(end)}`;
}

function labelForCost(cost: DiscoverDraftFilters['cost']) {
  if (cost === 'free') return 'Cost: Free';
  if (cost === 'paid') return 'Cost: Paid';
  return '';
}

function countActiveFilters(searchTerm: string, filters: DiscoverDraftFilters) {
  let count = 0;

  if (searchTerm.trim()) count += 1;
  if (filters.tags.length > 0) count += 1;
  if (filters.location.trim()) count += 1;
  if (filters.dateRange.start || filters.dateRange.end) count += 1;
  if (filters.cost !== 'all') count += 1;

  return count;
}

function cloneFilters(filters: DiscoverDraftFilters): DiscoverDraftFilters {
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

function buildRequest(
  rankingMode: MobileDiscoverRankingMode,
  searchTerm: string,
  filters: DiscoverDraftFilters,
  page = 1
): MobileDiscoverFeedRequest {
  return {
    rankingMode,
    searchTerm,
    categories: [],
    tags: filters.tags,
    location: filters.location.trim() || null,
    dateRange: filters.dateRange,
    format: 'all',
    cost: filters.cost,
    page,
  };
}

export default function DiscoverScreen() {
  const { tokens } = useAppTheme();
  const { profile } = useAuth();
  const [rankingMode, setRankingMode] = useState<MobileDiscoverRankingMode>(DEFAULT_RANKING_MODE);
  const [searchText, setSearchText] = useState('');
  const deferredSearchText = useDeferredValue(searchText);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<DiscoverDraftFilters>(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState<DiscoverDraftFilters>(DEFAULT_FILTERS);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [feed, setFeed] = useState<MobileDiscoverFeed | null>(null);
  const [previewFeed, setPreviewFeed] = useState<MobileDiscoverFeed | null>(null);
  const [events, setEvents] = useState<MobileDiscoverFeed['events']>([]);
  const [error, setError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(false);
  const requestSequenceRef = useRef(0);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchTerm(deferredSearchText.trim());
    }, 220);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [deferredSearchText]);

  const appliedRequest = useMemo(
    () => buildRequest(rankingMode, searchTerm, filters),
    [filters, rankingMode, searchTerm]
  );
  const previewRequest = useMemo(
    () => buildRequest(rankingMode, searchTerm, draftFilters),
    [draftFilters, rankingMode, searchTerm]
  );

  async function runDiscoverRequest(
    request: MobileDiscoverFeedRequest,
    mode: 'initial' | 'more' | 'refresh' = 'initial'
  ) {
    const requestSequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestSequence;

    if (mode === 'more') {
      setLoadingMore(true);
    } else if (mode === 'refresh') {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const nextFeed = await loadMobileDiscoverFeed(request);

      if (requestSequence !== requestSequenceRef.current) {
        return;
      }

      const mergedFeed = mergeDiscoverFeedPage(mode, feed, events, nextFeed);
      setFeed(mergedFeed.feed);
      setEvents(mergedFeed.events);
      setCurrentPage(request.page ?? 1);
      setHasMorePages(mergedFeed.hasMorePages);
      setError(null);
    } catch (nextError) {
      if (requestSequence !== requestSequenceRef.current) {
        return;
      }

      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to load discovery'
      );
    } finally {
      if (requestSequence !== requestSequenceRef.current) {
        return;
      }

      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void runDiscoverRequest(appliedRequest);
  }, [appliedRequest]);

  useEffect(() => {
    if (!isFilterOpen) {
      setPreviewFeed(null);
      setPreviewError(null);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);

    void loadMobileDiscoverFeed(previewRequest)
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
            : 'Unable to preview discovery'
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

  function clearAllFilters() {
    setSearchText('');
    setSearchTerm('');
    startTransition(() => {
      setFilters(DEFAULT_FILTERS);
      setDraftFilters(DEFAULT_FILTERS);
    });
  }

  function openFilters() {
    setDraftFilters(cloneFilters(filters));
    setIsFilterOpen(true);
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

  function updateAppliedFilters(nextFilters: DiscoverDraftFilters) {
    startTransition(() => {
      setFilters(nextFilters);
      setDraftFilters(nextFilters);
    });
  }

  function removeChip(key: string, value?: string) {
    if (key === 'search') {
      setSearchText('');
      setSearchTerm('');
      return;
    }

    if (key === 'location') {
      updateAppliedFilters({ ...filters, location: '' });
      return;
    }

    if (key === 'dateRange') {
      updateAppliedFilters({
        ...filters,
        dateRange: {
          start: null,
          end: null,
        },
      });
      return;
    }

    if (key === 'cost') {
      updateAppliedFilters({ ...filters, cost: 'all' });
      return;
    }

    if (key === 'tag' && value) {
      updateAppliedFilters({
        ...filters,
        tags: filters.tags.filter((entry) => entry !== value),
      });
    }
  }

  const tagLabelMap = new Map(
    (feed?.availableFilters?.tags ?? []).map((tag) => [tag.value, tag.label])
  );

  const chips: DiscoverChip[] = [];
  if (searchTerm) {
    chips.push({
      key: 'search',
      label: `Search: ${searchTerm}`,
      onRemove: () => removeChip('search'),
    });
  }
  if (filters.location.trim()) {
    chips.push({
      key: 'location',
      label: `Location: ${filters.location.trim()}`,
      onRemove: () => removeChip('location'),
    });
  }
  if (filters.dateRange.start || filters.dateRange.end) {
    chips.push({
      key: 'date-range',
      label: buildDateRangeLabel(filters.dateRange.start, filters.dateRange.end),
      onRemove: () => removeChip('dateRange'),
    });
  }
  if (filters.cost !== 'all') {
    chips.push({
      key: 'cost',
      label: labelForCost(filters.cost),
      onRemove: () => removeChip('cost'),
    });
  }
  filters.tags.forEach((tagValue) => {
    chips.push({
      key: `tag-${tagValue}`,
      label: `Tag: ${tagLabelMap.get(tagValue) ?? tagValue}`,
      onRemove: () => removeChip('tag', tagValue),
    });
  });

  const rankingOptions = feed?.controls.rankingModes ?? FALLBACK_RANKING_OPTIONS;
  const activeSheetFeed = previewFeed ?? feed;
  const topPicks = feed?.topPicks ?? null;
  const hasTopPicks = (topPicks?.cards.length ?? 0) > 0;
  const previewResultCount = activeSheetFeed?.results.totalCount ?? feed?.results.totalCount ?? 0;
  const appliedActiveFilterCount = countActiveFilters(searchTerm, filters);
  const draftActiveFilterCount = countActiveFilters(searchTerm, draftFilters);
  const isInitialLoading = loading && !feed;
  const showEmptyState = !loading && !error && events.length === 0 && !hasTopPicks;
  const showFeedHeading = hasTopPicks && events.length > 0;
  const hasMore = hasMorePages;
  const counts = activeSheetFeed?.counts ?? feed?.counts ?? {
    format: {
      virtual: 0,
      'in-person': 0,
      hybrid: 0,
    },
    cost: {
      free: 0,
      paid: 0,
    },
    categories: {},
    tags: {},
  };

  return (
    <>
      <DiscoverShell
        header={(compact) => (
          <View style={[styles.headerStack, compact && styles.headerStackCompact]}>
            <DiscoverSearchBar
              activeFilterCount={appliedActiveFilterCount}
              compact={compact}
              onChangeText={setSearchText}
              onOpenFilters={openFilters}
              value={searchText}
            />
            {!compact ? <DiscoverChipRail chips={chips} /> : null}
            <DiscoverRankingRail
              onChange={(nextValue) => {
                startTransition(() => {
                  setRankingMode(nextValue);
                });
              }}
              options={rankingOptions}
              value={rankingMode}
            />
          </View>
        )}
        refreshControl={
          <RefreshControl
            onRefresh={() => {
              void runDiscoverRequest(appliedRequest, 'refresh');
            }}
            refreshing={refreshing}
            tintColor={tokens.colors.accent}
          />
        }
      >
        {chips.length > 0 ? (
          <View style={styles.clearFiltersRow}>
            <Pressable onPress={clearAllFilters}>
              <Text
                style={{
                  color: tokens.colors.discoverTextSoft,
                  fontFamily: tokens.typography.sans,
                  fontSize: 13,
                  fontWeight: '700',
                }}
              >
                Clear all filters
              </Text>
            </Pressable>
          </View>
        ) : null}

        {isInitialLoading ? (
          <ScreenState
            description="Ranking the next set of events for your current filters."
            fullHeight
            mode="loading"
            title="Loading discovery"
            variant="plain"
          />
        ) : null}

        {error && !feed ? (
          <ScreenState
            description={error}
            mode="error"
            title="Discovery is unavailable"
            variant="discover"
          />
        ) : null}

        {topPicks ? (
          <DiscoverTopPicksSection
            onPressCard={(event) => router.push(`/event/${event.id}`)}
            topPicks={topPicks}
          />
        ) : null}

        {events.length > 0 ? (
          <View style={showFeedHeading ? styles.feedSection : undefined}>
            {showFeedHeading ? (
              <View style={styles.feedHeadingRow}>
                <Text
                  style={{
                    color: tokens.colors.discoverTextMuted,
                    fontFamily: tokens.typography.sans,
                    fontSize: 11,
                    fontWeight: '700',
                    letterSpacing: 0.1,
                  }}
                >
                  Recommended events
                </Text>
              </View>
            ) : null}

            <View style={styles.feedList}>
              {events.map((event, index) => (
                <DiscoverEventCard
                  key={event.id}
                  event={event}
                  onPress={() => router.push(`/event/${event.id}`)}
                  showDivider={index < events.length - 1}
                />
              ))}
            </View>
          </View>
        ) : null}

        {loadingMore ? (
          <View style={styles.loadMoreWrap}>
            <ActivityIndicator color={tokens.colors.accent} />
          </View>
        ) : null}

        {hasMore && !loadingMore ? (
          <Pressable
            onPress={() => {
              void runDiscoverRequest(
                { ...appliedRequest, page: currentPage + 1 },
                'more'
              );
            }}
            style={[
              styles.loadMoreButton,
              {
                backgroundColor: tokens.colors.discoverToolbar,
                borderColor: tokens.colors.discoverToolbarBorderStrong,
              },
            ]}
          >
            <Text
              style={{
                color: tokens.colors.textPrimary,
                fontFamily: tokens.typography.sans,
                fontSize: 14,
                fontWeight: '700',
              }}
            >
              Show more
            </Text>
          </Pressable>
        ) : null}

        {showEmptyState ? (
          <ScreenState
            description="Broaden the search, remove a few filters, or switch the ranking mode to surface more options."
            mode="empty"
            title="Adjust the feed and try again"
            variant="discover"
          />
        ) : null}

        {error && feed ? (
          <Text
            style={{
              color: tokens.colors.danger,
              fontFamily: tokens.typography.sans,
              fontSize: 13,
              lineHeight: 18,
            }}
          >
            {error}
          </Text>
        ) : null}
      </DiscoverShell>

      <DiscoverFilterSheet
        activeFilterCount={draftActiveFilterCount}
        counts={counts}
        isPreviewLoading={previewLoading}
        onApply={applyFilters}
        onChange={setDraftFilters}
        onClose={() => setIsFilterOpen(false)}
        onReset={clearAllFilters}
        profileTimezone={profile?.profile.timezone ?? null}
        resultCount={previewResultCount}
        tags={activeSheetFeed?.availableFilters?.tags ?? []}
        value={draftFilters}
        visible={isFilterOpen}
      />

      {previewError && isFilterOpen ? (
        <View style={styles.previewErrorBanner}>
          <Text
            style={{
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
              fontSize: 13,
              fontWeight: '600',
            }}
          >
            {previewError}
          </Text>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  clearFiltersRow: {
    alignItems: 'flex-end',
  },
  feedHeadingRow: {
    paddingHorizontal: 2,
  },
  feedList: {
    gap: 0,
  },
  feedSection: {
    gap: 3,
  },
  headerStack: {
    gap: 4,
  },
  headerStackCompact: {
    gap: 2,
  },
  loadMoreButton: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  loadMoreWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  previewErrorBanner: {
    alignSelf: 'center',
    backgroundColor: 'rgba(120, 53, 15, 0.96)',
    borderColor: 'rgba(251, 191, 36, 0.34)',
    borderRadius: 14,
    borderWidth: 1,
    bottom: 22,
    left: 16,
    maxWidth: 430,
    paddingHorizontal: 14,
    paddingVertical: 10,
    position: 'absolute',
    right: 16,
  },
});
