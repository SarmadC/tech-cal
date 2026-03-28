import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type {
  MobileDiscoverCost,
  MobileDiscoverFeedRequest,
  MobileDiscoverRankingMode,
} from '@kurecal/domain';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ScreenState } from '@/components/chrome/ScreenState';
import { DiscoverChipRail, type DiscoverChip } from '@/components/discover/DiscoverChipRail';
import { DiscoverEventCard } from '@/components/discover/DiscoverEventCard';
import {
  DiscoverFilterSheet,
  type DiscoverDraftFilters,
} from '@/components/discover/DiscoverFilterSheet';
import { DiscoverTopPicksSection } from '@/components/discover/DiscoverTopPicksSection';
import { DiscoverRankingRail } from '@/components/discover/DiscoverRankingRail';
import { DiscoverSearchBar } from '@/components/discover/DiscoverSearchBar';
import { DiscoverShell } from '@/components/discover/DiscoverShell';
import { getMobileApiClient } from '@/lib/mobileApi';
import { mobileQueryKeys } from '@/lib/queryKeys';
import { mobileQueryStaleTimes } from '@/lib/queryClient';
import { useMobileAuth } from '@/hooks/useMobileAuth';
import { useAppTheme } from '@/providers/ThemeProvider';

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
  { id: 'best-match' as const, label: 'Best match', description: 'Prioritize strongest career alignment.' },
  { id: 'trending' as const, label: 'Trending', description: 'Prioritize momentum and attendance.' },
  { id: 'soonest' as const, label: 'Soonest', description: 'Ordered by upcoming start time.' },
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

function labelForCost(cost: MobileDiscoverCost) {
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
  const { profile } = useMobileAuth();
  const [rankingMode, setRankingMode] = useState<MobileDiscoverRankingMode>(DEFAULT_RANKING_MODE);
  const [searchText, setSearchText] = useState('');
  const deferredSearchText = useDeferredValue(searchText);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<DiscoverDraftFilters>(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState<DiscoverDraftFilters>(DEFAULT_FILTERS);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

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

  const discoverQuery = useInfiniteQuery({
    queryKey: mobileQueryKeys.discover.feed(appliedRequest),
    initialPageParam: 1,
    staleTime: mobileQueryStaleTimes.short,
    queryFn: async ({ pageParam }) => {
      const result = await getMobileApiClient().getDiscoverFeed({
        ...appliedRequest,
        page: Number(pageParam),
      });

      if (!result.success) {
        throw new Error(result.error ?? 'Unable to load discovery');
      }

      return result.data;
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage?.results.hasMore ? allPages.length + 1 : undefined,
  });

  const previewQuery = useQuery({
    queryKey: mobileQueryKeys.discover.preview(previewRequest),
    enabled: isFilterOpen,
    staleTime: mobileQueryStaleTimes.live,
    queryFn: async () => {
      const result = await getMobileApiClient().getDiscoverFeed(previewRequest);

      if (!result.success) {
        throw new Error(result.error ?? 'Unable to preview discovery');
      }

      return result.data;
    },
  });

  const pages = discoverQuery.data?.pages ?? [];
  const feed = pages[0];
  const previewFeed = previewQuery.data;
  const events = useMemo(() => pages.flatMap((page) => page?.events ?? []), [pages]);
  const rankingOptions = feed?.controls.rankingModes ?? FALLBACK_RANKING_OPTIONS;
  const activeSheetFeed = previewFeed ?? feed;
  const topPicks = feed?.topPicks ?? null;
  const hasTopPicks = (topPicks?.cards.length ?? 0) > 0;

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

  const previewResultCount = activeSheetFeed?.results.totalCount ?? feed?.results.totalCount ?? 0;
  const appliedActiveFilterCount = countActiveFilters(searchTerm, filters);
  const draftActiveFilterCount = countActiveFilters(searchTerm, draftFilters);
  const isInitialLoading = discoverQuery.isLoading && !feed;
  const showEmptyState =
    !discoverQuery.isLoading &&
    !discoverQuery.isError &&
    events.length === 0 &&
    !hasTopPicks;
  const showFeedHeading = hasTopPicks && events.length > 0;
  const hasMore = pages[pages.length - 1]?.results.hasMore ?? false;

  return (
    <>
      <DiscoverShell
        header={(compact) => (
          <View style={[styles.headerStack, compact && styles.headerStackCompact]}>
            <DiscoverSearchBar
              value={searchText}
              onChangeText={setSearchText}
              onOpenFilters={openFilters}
              activeFilterCount={appliedActiveFilterCount}
              compact={compact}
            />
            {!compact ? <DiscoverChipRail chips={chips} /> : null}
            <DiscoverRankingRail
              options={rankingOptions}
              value={rankingMode}
              onChange={(nextValue) => {
                startTransition(() => {
                  setRankingMode(nextValue);
                });
              }}
            />
          </View>
        )}
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
            mode="loading"
            title="Loading discovery"
            description="Ranking the next set of events for your current filters."
            variant="plain"
            fullHeight
          />
        ) : null}

        {discoverQuery.isError ? (
          <ScreenState
            mode="error"
            title="Discovery is unavailable"
            description={
              discoverQuery.error instanceof Error
                ? discoverQuery.error.message
                : 'Try again in a moment.'
            }
            variant="discover"
          />
        ) : null}

        {topPicks ? (
          <DiscoverTopPicksSection
            topPicks={topPicks}
            onPressCard={(event) => router.push(`/event/${event.id}`)}
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

        {discoverQuery.isFetchingNextPage ? (
          <View style={styles.loadMoreWrap}>
            <ActivityIndicator color={tokens.colors.accent} />
          </View>
        ) : null}

        {hasMore && !discoverQuery.isFetchingNextPage ? (
          <Pressable
            onPress={() => {
              void discoverQuery.fetchNextPage();
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
            mode="empty"
            title="Adjust the feed and try again"
            description="Broaden the search, remove a few filters, or switch the ranking mode to surface more options."
            variant="discover"
          />
        ) : null}
      </DiscoverShell>

      <DiscoverFilterSheet
        visible={isFilterOpen}
        value={draftFilters}
        tags={activeSheetFeed?.availableFilters?.tags ?? []}
        counts={activeSheetFeed?.counts ?? feed?.counts ?? {
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
        }}
        resultCount={previewResultCount}
        activeFilterCount={draftActiveFilterCount}
        profileTimezone={profile?.timezone ?? null}
        isPreviewLoading={previewQuery.isFetching}
        onChange={setDraftFilters}
        onApply={applyFilters}
        onClose={() => setIsFilterOpen(false)}
        onReset={clearAllFilters}
      />
    </>
  );
}

const styles = StyleSheet.create({
  headerStack: {
    gap: 4,
  },
  headerStackCompact: {
    gap: 2,
  },
  clearFiltersRow: {
    alignItems: 'flex-end',
  },
  feedSection: {
    gap: 3,
  },
  feedHeadingRow: {
    paddingHorizontal: 2,
  },
  feedList: {
    gap: 0,
  },
  loadMoreWrap: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreButton: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
});
