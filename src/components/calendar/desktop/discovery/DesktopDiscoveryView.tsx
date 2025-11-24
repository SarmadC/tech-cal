'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Event, EventType, AppProfile, TrackedEvent } from '@/types';
import DiscoveryLayout from '@/components/discovery/DiscoveryLayout';
import DiscoverySidebar from '@/components/discovery/DiscoverySidebar';
import DiscoveryHeader from '@/components/discovery/DiscoveryHeader';
import EventCard from '@/components/discovery/EventCard';
import { UnifiedFilterOptions, UpdateFilterHandler } from '@/hooks/useUnifiedServerFiltering';
import { CaretDown } from '@phosphor-icons/react';
import { calculateFilterCounts } from '@/utils/filterCountUtils';
import { useEventEngagement } from '@/hooks/useEventEngagement';

export interface DesktopDiscoveryViewProps {
  events: Event[];
  categories: EventType[];
  profile: AppProfile | null;
  trackedEvents?: TrackedEvent[];
  onEventSelect?: (event: Event) => void;
  className?: string;
  filters: UnifiedFilterOptions;
  onUpdateFilter: UpdateFilterHandler;
  onSearch: () => void;
  totalCount: number;
}

const DesktopDiscoveryView: React.FC<DesktopDiscoveryViewProps> = ({
  events,
  categories,
  profile,
  trackedEvents = [],
  onEventSelect,
  className = '',
  filters,
  onUpdateFilter,
  onSearch,
  totalCount
}) => {
  const { isBookmarked, toggleBookmark } = useEventEngagement();
  const [pendingBookmarkIds, setPendingBookmarkIds] = useState<Set<string>>(new Set());

  const handleBookmarkToggle = useCallback(async (event: Event) => {
    if (!event?.id || pendingBookmarkIds.has(event.id)) {
      return;
    }

    setPendingBookmarkIds((prev) => new Set(prev).add(event.id));

    try {
      await toggleBookmark(event.id, event as unknown as Record<string, unknown>);
    } catch (error) {
      console.error('Failed to toggle bookmark from discovery card:', error);
    } finally {
      setPendingBookmarkIds((prev) => {
        const next = new Set(prev);
        next.delete(event.id);
        return next;
      });
    }
  }, [pendingBookmarkIds, toggleBookmark]);

  // Calculate filter counts from current events
  const counts = useMemo(() => {
    return calculateFilterCounts(events, categories);
  }, [events, categories]);

  return (
    <div className={`desktop-discovery-view ${className} min-h-full text-foreground`} role="main" aria-label="Discover tech events">
      <DiscoveryLayout
        sidebar={
          <DiscoverySidebar
            filters={{
              format: filters.format,
              cost: filters.cost,
              categories: filters.categories
            }}
            onUpdateFilter={onUpdateFilter}
            categories={categories}
            counts={counts}
          />
        }
        header={
          <DiscoveryHeader
            searchTerm={filters.searchTerm}
            onSearchChange={(val) => onUpdateFilter('searchTerm', val)}
            location={filters.locations[0] || ''}
            onLocationChange={(val) => onUpdateFilter('locations', val ? [val] : [])}
            dateRange={filters.dateRange}
            onDateRangeChange={(range) => onUpdateFilter('dateRange', range)}
            onSearch={onSearch}
          />
        }
        resultCount={totalCount}
        sortOption={
          <div className="relative group">
            <button className="flex items-center gap-2 text-sm font-medium text-foreground bg-muted/70 dark:bg-muted/20 px-3 py-1.5 rounded-lg border border-border/60 hover:border-foreground/40 transition-colors">
              <span>{filters.sortBy === 'date' ? 'Date' : filters.sortBy === 'popularity' ? 'Popular' : 'Recommended'}</span>
              <CaretDown size={14} />
            </button>
            {/* Dropdown could go here */}
          </div>
        }
      >
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            onClick={() => onEventSelect?.(event)}
            onBookmark={handleBookmarkToggle}
            isBookmarked={isBookmarked(event.id)}
            isBookmarking={pendingBookmarkIds.has(event.id)}
          />
        ))}
      </DiscoveryLayout>
    </div>
  );
};

export default DesktopDiscoveryView;
