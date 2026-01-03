'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Event, EventType, AppProfile, TrackedEvent } from '@/types';
import DiscoveryLayout from '@/components/discovery/DiscoveryLayout';
import DiscoverySidebar from '@/components/discovery/DiscoverySidebar';
import DiscoveryHeader from '@/components/discovery/DiscoveryHeader';
import EventCard from '@/components/discovery/EventCard';
import { UnifiedFilterOptions, UpdateFilterHandler } from '@/hooks/useUnifiedServerFiltering';
import { calculateFilterCounts, FilterCounts } from '@/utils/filterCountUtils';
import { useEventEngagement } from '@/hooks/useEventEngagement';
import { useSearchSuggestions } from '@/hooks/useSearchSuggestions';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

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
    onResetFilters: () => void;
    activeFilterCount: number;
    onNearMeClick?: () => void;
    isDetectingLocation?: boolean;
    isSearching?: boolean;
    countsFromServer?: FilterCounts | null;
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
    totalCount,
    onResetFilters,
    activeFilterCount,
    onNearMeClick,
    isDetectingLocation,
    isSearching,
    countsFromServer
}) => {
    const { isBookmarked, toggleBookmark } = useEventEngagement();
    const [pendingBookmarkIds, setPendingBookmarkIds] = useState<Set<string>>(new Set());
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Search suggestions and history for autocomplete
    const { suggestions, isLoading: isSuggestionsLoading } = useSearchSuggestions({
        searchTerm: filters.searchTerm,
        events: events as unknown as Parameters<typeof useSearchSuggestions>[0]['events'],
        categories,
        maxSuggestions: 6
    });

    const { history: searchHistory, addSearch } = useSearchHistory({
        respectAnalyticsConsent: true
    });

    // Add search to history when search is executed
    const handleSearchWithHistory = useCallback(() => {
        if (filters.searchTerm || filters.locations[0]) {
            addSearch(
                filters.searchTerm,
                filters.locations[0] || '',
                filters.dateRange
            );
        }
        onSearch();
    }, [filters.searchTerm, filters.locations, filters.dateRange, addSearch, onSearch]);

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
        return countsFromServer ?? calculateFilterCounts(events, categories);
    }, [countsFromServer, events, categories]);

    return (
        <div className={`desktop-discovery-view ${className} min-h-full text-foreground`} role="main" aria-label="Discover tech events">
            <DiscoveryLayout
                isSidebarOpen={isSidebarOpen}
                onSidebarClose={() => setIsSidebarOpen(false)}
                sidebar={
                    <DiscoverySidebar
                        filters={{
                            format: filters.format,
                            cost: filters.cost,
                            categories: filters.categories,
                            tags: filters.tags
                        }}
                        onUpdateFilter={onUpdateFilter}
                        categories={categories}
                        events={events}
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
                        onSearch={handleSearchWithHistory}
                        onResetFilters={onResetFilters}
                        activeFilterCount={activeFilterCount}
                        onFilterClick={() => setIsSidebarOpen(true)}
                        onNearMeClick={onNearMeClick}
                        isDetectingLocation={isDetectingLocation}
                        isSearching={isSearching}
                        suggestions={suggestions}
                        searchHistory={searchHistory}
                        isAutocompletLoading={isSuggestionsLoading}
                    />
                }
                resultCount={totalCount}
                sortOption={
                    <Select
                        value={filters.sortBy}
                        onValueChange={(value) => onUpdateFilter('sortBy', value as UnifiedFilterOptions['sortBy'])}
                    >
                        <SelectTrigger className="text-sm font-medium text-foreground bg-background-secondary px-3 py-1.5 rounded-lg border border-border hover:border-border-strong transition-colors w-auto min-w-[160px] h-auto">
                            <SelectValue placeholder="Recommended" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="career-impact">Recommended</SelectItem>
                            <SelectItem value="title">Name</SelectItem>
                            <SelectItem value="location">Location</SelectItem>
                        </SelectContent>
                    </Select>
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
