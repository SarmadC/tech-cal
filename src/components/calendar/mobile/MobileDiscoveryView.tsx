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
import UnifiedMobileNavbar from '@/components/common/UnifiedMobileNavbar';

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
        <div className="min-h-screen bg-background dark:bg-[#08090a] pb-24 mobile-discovery-view">
            {/* Top Navigation */}
            <UnifiedMobileNavbar
                navItems={[
                    { name: 'Discover', href: '/discover' },
                    { name: 'Calendar', href: '/calendar' },
                    { name: 'Events', href: '/events' },
                    { name: 'Dashboard', href: '/dashboard' },
                    { name: 'Settings', href: '/dashboard/settings' }
                ]}
                fixed={false}
                className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/40"
            />

            {/* Search & Filter Header (Sticky below navbar) */}
            <div className="sticky top-[var(--navbar-height,64px)] z-30 bg-background/90 backdrop-blur-md border-b border-border/40 px-4 py-3">
                <div className="flex items-center gap-2">
                    {/* Search Bar - Expanded or Collapsed */}
                    <div className="relative flex-1 min-w-0">
                        <div className="relative">
                            {isSearching ? (
                                <SpinnerGap className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" size={18} />
                            ) : (
                                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                            )}
                            <input
                                type="text"
                                placeholder="Search events..."
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
                                className="w-full bg-muted/50 border border-border/40 rounded-full py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-500/50 dark:focus:ring-[#fdfdfd]/50 transition-all"
                            />
                        </div>
                    </div>

                    {/* Near Me Button - Icon Only */}
                    <button
                        onClick={onNearMeClick}
                        className={`flex-shrink-0 flex items-center justify-center p-2.5 rounded-full border transition-colors ${isDetectingLocation
                            ? 'bg-blue-500/20 border-blue-500/50 text-blue-500'
                            : 'bg-muted/50 border-border/40 text-muted-foreground hover:bg-muted'
                            }`}
                        aria-label="Near Me"
                    >
                        <NavigationArrow size={18} weight="fill" />
                    </button>

                    {/* Filter Button */}
                    <button
                        onClick={() => setIsFilterOpen(true)}
                        className={`relative flex-shrink-0 p-2.5 rounded-full border transition-colors ${activeFilterCount > 0
                            ? 'bg-green-500/20 border-green-500/50 text-green-500 dark:bg-[#fdfdfd]/20 dark:border-[#fdfdfd]/50 dark:text-[#fdfdfd]'
                            : 'bg-muted/50 border-border/40 text-muted-foreground hover:bg-muted'
                            }`}
                    >
                        <SlidersHorizontal size={18} weight={activeFilterCount > 0 ? 'bold' : 'regular'} />
                        {activeFilterCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 dark:bg-[#fdfdfd] text-[10px] font-bold text-white dark:text-gray-900 flex items-center justify-center">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>

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
                                            // Optional: close on reset? No, usually keep open.
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
                </div>
            </div>

            {/* Event Feed */}
            <div className="px-4 py-4 space-y-5">
                {events.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                            <MagnifyingGlass size={32} className="text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">No events found</h3>
                        <p className="text-muted-foreground max-w-xs">Try adjusting your filters or search terms to find what you&apos;re looking for.</p>
                        <button
                            onClick={onResetFilters}
                            className="mt-6 px-6 py-2 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90"
                        >
                            Clear all filters
                        </button>
                    </div>
                ) : (
                    events.map((event) => (
                        <DiscoveryCard
                            key={event.id}
                            event={event}
                            onDetailsClick={() => onEventSelect?.(event)}
                            className="w-full"
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default MobileDiscoveryView;
