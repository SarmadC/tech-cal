import type {
  MobileDiscoverCost,
  MobileDiscoverDateRange,
  MobileDiscoverFeed,
  MobileDiscoverFeedRequest,
  MobileDiscoverRankingMode,
} from '@kurecal/domain';

import { formatLocalDateKey } from './calendarDateUtils';

export interface DiscoverDraftFilters {
  tags: string[];
  location: string;
  dateRange: MobileDiscoverDateRange;
  cost: MobileDiscoverCost;
}

export interface DiscoverChip {
  key: string;
  label: string;
  onRemove: () => void;
}

export const DEFAULT_DISCOVER_RANKING_MODE: MobileDiscoverRankingMode =
  'best-match';

export const DEFAULT_DISCOVER_FILTERS: DiscoverDraftFilters = {
  tags: [],
  location: '',
  dateRange: {
    start: null,
    end: null,
  },
  cost: 'all',
};

export function cloneDiscoverFilters(
  filters: DiscoverDraftFilters
): DiscoverDraftFilters {
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

export function toggleDiscoverSelection(values: string[], value: string) {
  if (values.includes(value)) {
    return values.filter((entry) => entry !== value);
  }

  return [...values, value];
}

export function formatDiscoverDateLabel(value: string | null) {
  if (!value) {
    return '';
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function buildDiscoverDateRangeLabel(value: MobileDiscoverDateRange) {
  if (!value.start && !value.end) {
    return 'Any date';
  }

  if (value.start && value.end) {
    return `${formatDiscoverDateLabel(value.start)} - ${formatDiscoverDateLabel(
      value.end
    )}`;
  }

  if (value.start) {
    return `From ${formatDiscoverDateLabel(value.start)}`;
  }

  return `Until ${formatDiscoverDateLabel(value.end)}`;
}

export function labelForDiscoverCost(cost: MobileDiscoverCost) {
  if (cost === 'free') return 'Cost: Free';
  if (cost === 'paid') return 'Cost: Paid';
  return '';
}

export function countActiveDiscoverFilters(
  searchTerm: string,
  filters: DiscoverDraftFilters
) {
  let count = 0;

  if (searchTerm.trim()) count += 1;
  if (filters.tags.length > 0) count += 1;
  if (filters.location.trim()) count += 1;
  if (filters.dateRange.start || filters.dateRange.end) count += 1;
  if (filters.cost !== 'all') count += 1;

  return count;
}

export function buildDiscoverRequest(
  rankingMode: MobileDiscoverRankingMode,
  searchTerm: string,
  filters: DiscoverDraftFilters,
  page = 1
): MobileDiscoverFeedRequest {
  return {
    rankingMode,
    searchTerm: searchTerm.trim() || undefined,
    categories: [],
    tags: filters.tags,
    location: filters.location.trim() || null,
    dateRange: filters.dateRange,
    format: 'all',
    cost: filters.cost,
    page,
  };
}

export function mergeDiscoverFeedPage(
  mode: 'initial' | 'more' | 'refresh',
  currentFeed: MobileDiscoverFeed | null,
  currentEvents: MobileDiscoverFeed['events'],
  nextFeed: MobileDiscoverFeed
) {
  return {
    feed: mode === 'more' ? currentFeed ?? nextFeed : nextFeed,
    events: mode === 'more' ? [...currentEvents, ...nextFeed.events] : nextFeed.events,
    hasMorePages: nextFeed.results.hasMore,
  };
}

export function buildDiscoverDateOptions(totalDays = 120, now = new Date()) {
  const options: string[] = [];
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  for (let index = 0; index < totalDays; index += 1) {
    const next = new Date(today);
    next.setDate(today.getDate() + index);
    options.push(formatLocalDateKey(next));
  }

  return options;
}
