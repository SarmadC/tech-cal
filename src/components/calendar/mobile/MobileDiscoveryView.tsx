'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Event, EventType, AppProfile } from '@/types';
import DiscoveryCard from './DiscoveryCard';
import { UnifiedFilterOptions, UpdateFilterHandler } from '@/hooks/useUnifiedServerFiltering';
import { useEventEngagement } from '@/hooks/useEventEngagement';
import { FilterCounts } from '@/utils/filterCountUtils';
import { MagnifyingGlass, SlidersHorizontal, NavigationArrow, SpinnerGap } from '@phosphor-icons/react';
import DiscoverySidebar from '@/components/discovery/DiscoverySidebar';
import { calculateFilterCounts } from '@/utils/filterCountUtils';
import MobileBottomNav from '@/components/common/MobileBottomNav';
import UnifiedMobileNavbar from '@/components/common/UnifiedMobileNavbar';
import { APP_MOBILE_NAV_ITEMS } from '@/constants/navigation';

import { cn } from '@/lib/utils';

export interface MobileDiscoveryViewProps {
    events: Event[];
    categories: EventType[];
    profile: AppProfile | null;
    onEventSelect?: (event: Event) => void;
    filters: UnifiedFilterOptions;
    onUpdateFilter: UpdateFilterHandler;
    onSearch: () => void;
    totalCount: number;
    onResetFilters: () => void;
    activeFilterCount: number;
    countsFromServer?: FilterCounts | null;
    onNearMeClick?: () => void;
    isDetectingLocation?: boolean;
    isSearching?: boolean;
}

const MobileDiscoveryView: React.FC<MobileDiscoveryViewProps> = ({
    events,
    categories,
    profile,
    onEventSelect,
    filters,
    onUpdateFilter,
    onSearch,
    totalCount,
    onResetFilters,
    activeFilterCount,
    countsFromServer,
    onNearMeClick,
    isDetectingLocation,
    isSearching
}) => {
    // Custom Drawer State
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Calculate filter counts
    const counts = useMemo(() => {
        return countsFromServer ?? calculateFilterCounts(events, categories);
    }, [countsFromServer, events, categories]);

    // Local search state - updates filter immediately, hook handles debouncing for API calls
    const [localSearchTerm, setLocalSearchTerm] = useState(filters.searchTerm || '');

    // Sync local state if filters change externally
    useEffect(() => {
        setLocalSearchTerm(filters.searchTerm || '');
    }, [filters.searchTerm]);

    // Update filter immediately on each keystroke - the useUnifiedServerFiltering hook
    // already debounces API calls (150ms), so no need for double-debouncing here
    const handleSearchChange = (value: string) => {
        setLocalSearchTerm(value);
        onUpdateFilter('searchTerm', value);
    };

    return (
        <div className="min-h-screen bg-[var(--background-main)] pb-24 mobile-discovery-view">
            <UnifiedMobileNavbar
                navItems={APP_MOBILE_NAV_ITEMS}
                fixed={false}
                className="sticky top-0 z-40 bg-[var(--background-main)]/95 backdrop-blur-md border-b border-[var(--border-subtle)]"
            />
            {/* Search & Filter Header (Sticky at top) */}
            <div className="sticky top-[57px] z-30 bg-[var(--background-main)]/95 backdrop-blur-md border-b border-[var(--border-subtle)] pt-4 pb-3 px-4">
                <div className="flex items-center gap-3">
                    {/* Search Bar - Full Width with Integrated Filter */}
                    <div className="relative flex-1 group">
                        <MagnifyingGlass
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--foreground-tertiary)] group-focus-within:text-[var(--foreground-primary)] transition-colors"
                            size={18}
                        />
                        <input
                            type="text"
                            placeholder="Search..."
                            maxLength={200}
                            value={localSearchTerm}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            onBlur={(e) => handleSearchChange(e.target.value.trim())}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    onUpdateFilter('searchTerm', localSearchTerm.trim());
                                    onSearch();
                                }
                            }}
                            className="w-full bg-transparent border border-[var(--border-default)] rounded-xl py-2.5 pl-10 pr-10 text-[15px] text-[var(--foreground-primary)] placeholder:text-[var(--foreground-tertiary)] focus:outline-none focus:border-[var(--border-strong)] focus:bg-[var(--background-elevated)]/[0.02] transition-all h-[44px]"
                        />

                        {/* Filter Trigger inside Search Bar */}
                        <button
                            onClick={() => setIsFilterOpen(true)}
                            className={cn(
                                "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors",
                                activeFilterCount > 0
                                    ? "text-[var(--accent-primary)] bg-[var(--accent-primary)]/10"
                                    : "text-[var(--foreground-tertiary)] hover:text-[var(--foreground-primary)] hover:bg-[var(--background-elevated)]"
                            )}
                        >
                            <SlidersHorizontal size={18} weight={activeFilterCount > 0 ? 'fill' : 'regular'} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Custom Drawer / Sheet Overlay */}
            {isFilterOpen && (
                <div className="fixed inset-0 z-[100] flex flex-col justify-end isolate">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setIsFilterOpen(false)}
                    />

                    {/* Content */}
                    <div className="relative w-full h-[85vh] bg-card rounded-t-[24px] border-t border-border flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                            <h2 className="text-xl font-semibold text-foreground">Filters</h2>
                            <button
                                onClick={() => setIsFilterOpen(false)}
                                className="p-2 -mr-2 text-muted-foreground hover:text-foreground"
                            >
                                <span className="sr-only">Close</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-4">
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
                                mobileMode={true}
                            />
                        </div>

                        <div className="p-4 border-t border-border bg-card pb-8 flex gap-3">
                            <button
                                onClick={() => {
                                    onResetFilters();
                                }}
                                className="flex-1 py-3 rounded-xl border border-border text-foreground font-medium hover:bg-muted transition-colors"
                            >
                                Reset
                            </button>
                            <button
                                onClick={() => setIsFilterOpen(false)}
                                className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-500 dark:bg-[#fdfdfd] dark:text-gray-900 dark:hover:bg-[#fdfdfd]/90 shadow-lg shadow-green-900/20 dark:shadow-[#fdfdfd]/20 transition-colors"
                            >
                                Show Results
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Event Feed */}
            <div className="px-4 py-4 space-y-4">
                {events.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 rounded-full bg-[var(--background-elevated)] flex items-center justify-center mb-4">
                            <MagnifyingGlass size={32} className="text-[var(--foreground-tertiary)]" />
                        </div>
                        <h3 className="text-lg font-semibold text-[var(--foreground-primary)] mb-2">No events found</h3>
                        <p className="text-[var(--foreground-secondary)] max-w-xs">Try adjusting your filters or search terms to find what you&apos;re looking for.</p>
                        <button
                            onClick={onResetFilters}
                            className="mt-6 px-6 py-2 rounded-full bg-[var(--accent-primary)] text-[var(--accent-primary-foreground)] font-semibold text-sm hover:opacity-90"
                        >
                            Clear all filters
                        </button>
                    </div>
                ) : (
                    events.map((event) => (
                        <DiscoveryCard
                            key={event.id}
                            event={event}
                            onClick={() => onEventSelect?.(event)}
                            className="w-full"
                        />
                    ))
                )}
            </div>

            <MobileBottomNav />
        </div>
    );
};

export default MobileDiscoveryView;
