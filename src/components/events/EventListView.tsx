'use client';

import { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePostHog } from 'posthog-js/react';
import dynamic from 'next/dynamic';
import { SlidersHorizontal, LockKey } from '@phosphor-icons/react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { useUnifiedServerFiltering } from '@/hooks/useUnifiedServerFiltering';
import { useNetworkEventCounts } from '@/hooks/useNetworkEventCounts';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from '@/components/app-sidebar';
import UnifiedMobileNavbar from '@/components/common/UnifiedMobileNavbar';
import { APP_MOBILE_NAV_ITEMS } from '@/constants/navigation';
import MobileBottomNav from '@/components/common/MobileBottomNav';
import EventDetailSidebar from '@/components/calendar/EventDetailSidebar';
import { Button } from '@/components/ui/button';
import MultiSelectDropdown, { MultiSelectOption } from '@/components/ui/MultiSelectDropdown';
import { AdminDataTable, AdminDataTableColumn } from '@/components/admin/AdminDataTable';
import { AdminToolbarProvider } from '@/contexts/AdminToolbarContext';
import type { EventType, AppProfile, TrackedEvent } from '@/types';
import { formatDate, formatTime } from '@/utils/dateUtils';
import { Badge } from '@/components/ui/badge';
import { generateEventSlug } from '@/utils/slugUtils';
import Loading from '@/components/Loading';
import { useIsMobile } from '@/hooks/useDeviceDetection';
import MobileEventListCard from './MobileEventListCard';
import DiscoverySidebar from '@/components/discovery/DiscoverySidebar';
import { calculateFilterCounts } from '@/utils/filterCountUtils';
import '@/app/styles/discovery-sidebar.css';
import DiscoveryHeader from '@/components/discovery/DiscoveryHeader';
import { useRemoteSearchSuggestions } from '@/hooks/useRemoteSearchSuggestions';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { useAuth } from '@/contexts';

interface EventListViewProps {
    initialCategories: EventType[];
    profile: AppProfile | null;
    locationOptions: string[];
    initialCircleSlug?: string;
}

interface EventRow {
    id: string;
    title: string;
    organizer: string;
    startDisplay: string;
    endDisplay?: string | null;
    location: string;
    categoryLabel?: string;
    categoryColor?: string;
    priceRange?: string | null;
    status: string;
    slug: string;
    event: TrackedEvent;
}

function toInputValue(date: Date | null): string {
    if (!date) return '';
    const pad = (value: number) => value.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const MobileEventDetailPanelDynamic = dynamic(
    () => import('@/components/calendar/mobile/MobileEventDetailPanel'),
    { loading: () => <Loading /> },
);

export default function EventListView({ initialCategories, profile, locationOptions, initialCircleSlug }: EventListViewProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const posthog = usePostHog();
    const searchParams = useSearchParams();
    const { profile: authProfile } = useAuth();
    const activeProfile = authProfile ?? profile;

    const startOfToday = useMemo(() => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        return date;
    }, []);

    // Helper function to get theme-aware category badge styles
    const getCategoryBadgeStyles = useCallback((categoryColor: string | undefined) => {
        // Convert hex to RGB for opacity manipulation
        const hexToRgb = (hex: string): [number, number, number] | null => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? [
                parseInt(result[1], 16),
                parseInt(result[2], 16),
                parseInt(result[3], 16)
            ] : null;
        };

        if (!categoryColor) {
            // Fallback to accent color - use CSS variable with opacity
            return {
                backgroundColor: isDark ? 'var(--accent-primary-light)' : 'rgba(0, 0, 0, 0.08)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)',
                color: 'var(--accent-primary)',
            };
        }

        const rgb = hexToRgb(categoryColor);
        if (!rgb) {
            // If color parsing fails, use fallback
            return {
                backgroundColor: isDark ? 'var(--accent-primary-light)' : 'rgba(0, 0, 0, 0.08)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)',
                color: 'var(--accent-primary)',
            };
        }

        if (isDark) {
            // Dark mode: lighter backgrounds with higher opacity, lighter text
            return {
                backgroundColor: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.15)`,
                borderColor: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.3)`,
                color: categoryColor,
            };
        } else {
            // Light mode: darker backgrounds with lower opacity, darker text for contrast
            // Use a darker version of the color for text
            const darkenColor = (r: number, g: number, b: number, factor: number = 0.4): string => {
                const newR = Math.max(0, Math.floor(r * (1 - factor)));
                const newG = Math.max(0, Math.floor(g * (1 - factor)));
                const newB = Math.max(0, Math.floor(b * (1 - factor)));
                return `rgb(${newR}, ${newG}, ${newB})`;
            };

            return {
                backgroundColor: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.12)`,
                borderColor: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.25)`,
                color: darkenColor(rgb[0], rgb[1], rgb[2], 0.4), // Darker text for better contrast
            };
        }
    }, [isDark]);

    const initialFilters = useMemo(() => ({
        sortBy: 'date' as const,
        sortDirection: 'asc' as const,
        pageSize: 20,
        dateRange: { start: startOfToday, end: null as Date | null },
        tags: initialCircleSlug ? [initialCircleSlug] : [],
    }), [startOfToday, initialCircleSlug]);

    const locationSelectOptions = useMemo<MultiSelectOption[]>(() => locationOptions.map((value) => ({
        value,
        label: value,
    })), [locationOptions]);

    const {
        filteredEvents,
        isLoading,
        error,
        filters,
        activeFilterCount,
        updateFilter,
        resetFilters,
        refetch,
        pagination,
        totalCount,
        counts: countsFromServer,
        isDetectingLocation,
        isBackgroundRefetch,
    } = useUnifiedServerFiltering(activeProfile, initialFilters, { surface: 'discover' });
    const { countsByEventId } = useNetworkEventCounts(filteredEvents.map((event) => event.id));

    const eventsWithNetwork = useMemo(() => {
        if (Object.keys(countsByEventId).length === 0) {
            return filteredEvents;
        }

        return filteredEvents.map((event) => {
            const networkCounts = countsByEventId[event.id];
            if (!networkCounts) {
                return event;
            }

            return {
                ...event,
                networkAttendingCount: networkCounts.networkCount,
                networkSampleAvatars: networkCounts.sampleAvatars,
            };
        });
    }, [filteredEvents, countsByEventId]);

    const [selectedEvent, setSelectedEvent] = useState<TrackedEvent | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const isMobile = useIsMobile();
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Scroll to top when page changes
    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [pagination.page]);

    // Calculate filter counts - use server counts if available, otherwise calculate from filtered events
    const filterCounts = useMemo(() => {
        return countsFromServer ?? calculateFilterCounts(eventsWithNetwork, initialCategories);
    }, [countsFromServer, eventsWithNetwork, initialCategories]);

    // Hook up search suggestions and history for DiscoveryHeader - NOW positioned correctly
    const { suggestions, isLoading: isSuggestionsLoading } = useRemoteSearchSuggestions({
        searchTerm: filters.searchTerm,
        maxSuggestions: 6
    });

    const { history: searchHistory, addSearch } = useSearchHistory({
        respectAnalyticsConsent: true
    });

    const handleSearchWithHistory = useCallback(() => {
        if (filters.searchTerm || filters.locations[0]) {
            addSearch(
                filters.searchTerm,
                filters.locations[0] || '',
                filters.dateRange
            );
        }
        refetch();
    }, [filters.searchTerm, filters.locations, filters.dateRange, addSearch, refetch]);


    const rows: EventRow[] = useMemo(() => eventsWithNetwork.map((event: TrackedEvent) => {
        const startDisplay = formatDate(event.startTime, event.timezone);
        const timeDisplay = formatTime(event.startTime, event.timezone);
        const endDisplay = event.endTime ? formatTime(event.endTime, event.timezone) : null;
        const slug = generateEventSlug(event.title, event.id);
        return {
            id: event.id,
            title: event.title,
            organizer: event.organizer,
            startDisplay: `${startDisplay} · ${timeDisplay}`,
            endDisplay,
            location: event.location || 'TBD',
            categoryLabel: event.category?.name,
            categoryColor: event.category?.color,
            priceRange: event.priceRange,
            status: event.status,
            slug,
            event,
        };
    }), [eventsWithNetwork]);

    const handleOpenDetails = useCallback((event: TrackedEvent) => {
        setSelectedEvent(event);
    }, []);

    const handleCloseDetails = useCallback(() => {
        setSelectedEvent(null);
    }, []);

    const columns: AdminDataTableColumn<EventRow>[] = useMemo(() => [
        {
            key: 'title',
            header: 'Event',
            sortable: true,
            render: (row) => (
                <div className="flex flex-col py-1 pl-2">
                    <span className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100">{row.title}</span>
                    {row.organizer && row.organizer !== 'Unknown' && (
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">{row.organizer}</span>
                    )}
                </div>
            ),
            width: '50%',
            align: 'left'
        },
        {
            key: 'startDisplay',
            header: 'Start',
            sortable: true,
            render: (row) => {
                const parts = row.startDisplay.split(' · ');
                return (
                    <div className="flex items-center gap-1.5 align-middle h-full">
                        <span className="text-[13px] text-zinc-900 dark:text-zinc-100 tabular-nums whitespace-nowrap">{parts[0]}</span>
                        <span className="text-[13px] text-zinc-400 dark:text-zinc-600">·</span>
                        <span className="text-[13px] text-zinc-500 dark:text-zinc-500 tabular-nums whitespace-nowrap">{parts[1]}</span>
                    </div>
                );
            },
            width: '20%',
        },
        {
            key: 'location',
            header: 'Location',
            sortable: true,
            render: (row) => (
                <span className="text-[13px] text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                    {/* <MapPin size={12} className="opacity-70" /> */}
                    {row.location}
                </span>
            ),
            width: '15%',
        },
        {
            key: 'category',
            header: 'Category',
            align: 'right',
            render: (row) => (
                row.categoryLabel ? (
                    <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border"
                        style={getCategoryBadgeStyles(row.categoryColor)}
                    >
                        {row.categoryLabel}
                    </span>
                ) : null
            ),
            width: '15%',
        },
    ], [getCategoryBadgeStyles]);

    const handleSortChange = (key: string, direction: 'asc' | 'desc') => {
        switch (key) {
            case 'title':
                updateFilter('sortBy', 'title');
                break;
            case 'location':
                updateFilter('sortBy', 'location');
                break;
            case 'startDisplay':
            default:
                updateFilter('sortBy', 'date');
                break;
        }
        updateFilter('sortDirection', direction);
        updateFilter('page', 1);
    };

    const pageSizeOptions = useMemo(() => {
        const base = new Set<number>([10, 20, 50, 100, pagination.pageSize]);
        return Array.from(base).filter((value) => value > 0).sort((a, b) => a - b);
    }, [pagination.pageSize]);

    const handlePageSizeChange = useCallback((size: number) => {
        const isSamePageSize = size === pagination.pageSize;
        const isFirstPage = pagination.page === 1;

        if (isSamePageSize && isFirstPage) {
            return;
        }

        if (!isFirstPage) {
            updateFilter('page', 1);
        }

        if (!isSamePageSize) {
            updateFilter('pageSize', size);
        }
    }, [pagination.page, pagination.pageSize, updateFilter]);

    const handlePageChange = useCallback((page: number) => {
        const nextPage = Math.max(1, Math.min(page, pagination.totalPages));
        updateFilter('page', nextPage);
    }, [pagination.totalPages, updateFilter]);

    const hasResults = totalCount > 0 && rows.length > 0;
    const rangeStart = hasResults ? (pagination.page - 1) * pagination.pageSize + 1 : 0;
    const rangeEnd = hasResults ? Math.min(rangeStart + rows.length - 1, totalCount) : 0;

    const activeQueryError = error; // Error from hook
    const isUnauthorized = activeQueryError?.includes('401') || error?.includes('401');

    useEffect(() => {
        if (isUnauthorized) {
            posthog?.capture('events_wall_shown', {
                referrer: document.referrer,
                src: searchParams.get('src') ?? null,
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isUnauthorized]);

    const tableSortKey = useMemo(() => {
        switch (filters.sortBy) {
            case 'title':
                return 'title';
            case 'location':
                return 'location';
            case 'default':
            case 'date':
            default:
                return 'startDisplay';
        }
    }, [filters.sortBy]);

    const sortLabel = useMemo(() => {
        const direction = filters.sortDirection === 'desc';
        switch (filters.sortBy) {
            case 'title':
                return direction ? 'Event (Z→A)' : 'Event (A→Z)';
            case 'location':
                return direction ? 'Location (Z→A)' : 'Location (A→Z)';
            case 'popularity':
                return direction ? 'Popularity (low first)' : 'Popularity (high first)';
            case 'career-impact':
                return direction ? 'Career impact (low first)' : 'Career impact (high first)';
            case 'default':
            case 'date':
            default:
                return direction ? 'Start date (Newest first)' : 'Start date (Soonest first)';
        }
    }, [filters.sortBy, filters.sortDirection]);

    return (
        <SidebarProvider>
            <UnifiedMobileNavbar
                navItems={APP_MOBILE_NAV_ITEMS}
                fixed={true}
                className="bg-white/95 dark:bg-[#08090a]/95 backdrop-blur-xl border-b border-border/40"
            />
            {isMobile && <MobileBottomNav />}
            <div className="flex h-screen bg-white dark:bg-[#08090a]">
                {!isMobile && <AppSidebar />}
                <main className="flex-1 flex flex-col overflow-hidden relative">
                    <div ref={scrollContainerRef} className="flex-1 overflow-auto">
                        <div className="min-h-screen relative bg-white dark:bg-[#08090a]">

                            {/* Mobile View */}
                            {isMobile ? (
                                <div className="relative pt-20 pb-40">
                                    {/* Mobile Header */}
                                    <header className="px-4 pb-3 border-b border-white/10">
                                        <div className="flex items-center justify-between mb-1">
                                            <div>
                                                <h1 className="text-2xl font-bold text-foreground-primary">Events</h1>
                                                <p className="text-sm text-foreground-secondary mt-1">
                                                    {totalCount} events
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => setIsFilterOpen(true)}
                                                className="p-2 rounded-lg transition-colors text-foreground-secondary hover:text-foreground-primary hover:bg-white/5"
                                                aria-label="Open filters"
                                            >
                                                <SlidersHorizontal size={20} weight="regular" />
                                            </button>
                                        </div>
                                    </header>

                                    {/* Filter Drawer */}
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
                                                    {/* Date Range Section */}
                                                    <div className="filter-section filter-section-with-margin mb-4">
                                                        <div className="flex items-center justify-between w-full mb-2 py-1">
                                                            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">Date Range</h3>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="flex flex-col gap-1.5">
                                                                <label htmlFor="drawer-start-date" className="text-xs text-muted-foreground">Start</label>
                                                                <input
                                                                    id="drawer-start-date"
                                                                    type="date"
                                                                    value={toInputValue(filters.dateRange.start)}
                                                                    onChange={(event) => {
                                                                        const value = event.target.value ? new Date(`${event.target.value}T00:00:00`) : null;
                                                                        updateFilter('dateRange', { start: value, end: filters.dateRange.end });
                                                                        updateFilter('page', 1);
                                                                    }}
                                                                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent-primary/60 transition-colors"
                                                                />
                                                            </div>
                                                            <div className="flex flex-col gap-1.5">
                                                                <label htmlFor="drawer-end-date" className="text-xs text-muted-foreground">End</label>
                                                                <input
                                                                    id="drawer-end-date"
                                                                    type="date"
                                                                    value={toInputValue(filters.dateRange.end)}
                                                                    onChange={(event) => {
                                                                        const value = event.target.value ? new Date(`${event.target.value}T23:59:59`) : null;
                                                                        updateFilter('dateRange', { start: filters.dateRange.start, end: value });
                                                                        updateFilter('page', 1);
                                                                    }}
                                                                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent-primary/60 transition-colors"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Locations Section */}
                                                    <div className="filter-section filter-section-with-margin mb-4">
                                                        <div className="flex items-center justify-between w-full mb-2 py-1">
                                                            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">Locations</h3>
                                                        </div>
                                                        <MultiSelectDropdown
                                                            label=""
                                                            options={locationSelectOptions}
                                                            selectedValues={filters.locations}
                                                            onChange={(values) => {
                                                                updateFilter('locations', values);
                                                                updateFilter('page', 1);
                                                            }}
                                                            placeholder="Select locations"
                                                        />
                                                    </div>

                                                    {/* Discovery Sidebar for Format, Cost, Categories, Tags */}
                                                    <DiscoverySidebar
                                                        filters={{
                                                            format: filters.format,
                                                            cost: filters.cost,
                                                            categories: filters.categories,
                                                            tags: filters.tags
                                                        }}
                                                        onUpdateFilter={updateFilter}
                                                        categories={initialCategories}
                                                        events={filteredEvents.map(e => ({
                                                            id: e.id,
                                                            tags: e.tags
                                                        }))}
                                                        counts={filterCounts}
                                                        mobileMode={true}
                                                    />
                                                </div>

                                                <div className="p-4 border-t border-border bg-card pb-8 flex gap-3">
                                                    <button
                                                        onClick={() => {
                                                            resetFilters();
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

                                    {/* Mobile Event List */}
                                    {isLoading ? (
                                        <div className="flex items-center justify-center py-12">
                                            <Loading />
                                        </div>
                                    ) : isUnauthorized ? (
                                        <div className="py-16 px-4 text-center flex flex-col items-center justify-center h-full">
                                            <div className="w-12 h-12 bg-zinc-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4 text-zinc-400 dark:text-zinc-500">
                                                <LockKey size={24} weight="duotone" />
                                            </div>
                                            <h3 className="text-xl font-semibold text-foreground-primary mb-2">Sign in to view events</h3>
                                            <p className="text-sm text-foreground-secondary mb-6 max-w-[280px]">
                                                Join our community to discover, track, and organize upcoming tech events.
                                            </p>
                                            <Link href="/login" className="w-full sm:w-auto" onClick={() => posthog?.capture('events_wall_cta_clicked', { destination: '/login' })}>
                                                <Button className="w-full sm:w-auto px-8 font-medium">
                                                    Sign In
                                                </Button>
                                            </Link>
                                        </div>
                                    ) : rows.length === 0 ? (
                                        <div className="py-12 text-center">
                                            <h3 className="text-lg font-semibold text-foreground-primary mb-2">No events found</h3>
                                            <p className="text-sm text-foreground-secondary mb-4">
                                                Adjust your filters to discover more events.
                                            </p>
                                            <Button size="sm" onClick={() => resetFilters()}>
                                                Reset filters
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="mt-2">
                                            {rows.map((row) => (
                                                <MobileEventListCard
                                                    key={row.id}
                                                    event={row.event}
                                                    category={initialCategories.find(c => c.id === row.event.eventTypeId)}
                                                    onClick={() => handleOpenDetails(row.event)}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {/* Mobile Pagination - Fixed Footer above Bottom Nav */}
                                    {isMobile && !isLoading && rows.length > 0 && pagination.totalPages > 1 && (
                                        <div
                                            className="fixed left-0 right-0 z-40 flex items-center justify-between px-4 py-2 border-t border-zinc-100 dark:border-white/5 bg-white/95 dark:bg-[#0F0F0F]/95 backdrop-blur-md min-h-[48px]"
                                            style={{ bottom: 'calc(60px + env(safe-area-inset-bottom))' }}
                                        >
                                            {/* Previous Button - Anchored Left */}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handlePageChange(pagination.page - 1)}
                                                disabled={pagination.page <= 1}
                                                className="text-sm font-medium text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5 pl-2 pr-3 disabled:opacity-30"
                                            >
                                                <span className="mr-1">‹</span> Previous
                                            </Button>

                                            {/* Page Counter - Absolute Center */}
                                            <span className="absolute left-1/2 -translate-x-1/2 text-[13px] font-mono font-medium text-zinc-500 dark:text-[#A1A1AA] tabular-nums tracking-wide">
                                                {pagination.page} / {pagination.totalPages}
                                            </span>

                                            {/* Next Button - Anchored Right */}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handlePageChange(pagination.page + 1)}
                                                disabled={pagination.page >= pagination.totalPages}
                                                className="text-sm font-medium text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 dark:text-white dark:hover:bg-white/5 pl-3 pr-2 disabled:opacity-30"
                                            >
                                                Next <span className="ml-1">›</span>
                                            </Button>
                                        </div>
                                    )}

                                    {error && !isUnauthorized && (
                                        <p className="text-xs text-destructive text-center mt-4">
                                            Failed to load events.{' '}
                                            <button className="underline" onClick={() => refetch()}>Try again</button>
                                        </p>
                                    )}
                                </div>
                            ) : (
                                /* Desktop View (unchanged) */
                                <div className="relative max-w-[1600px] mx-auto px-6 pt-16 pb-8 space-y-6">
                                    <header className="flex flex-col gap-3">
                                        <div className="flex items-center gap-3">
                                            <div>
                                                <h1 className="text-3xl font-semibold text-foreground-primary">Event Listings</h1>
                                                <p className="text-sm text-foreground-secondary">
                                                    Browse and organize upcoming events with advanced filtering controls.
                                                </p>
                                            </div>
                                        </div>
                                    </header>

                                    {/* Minimal Toolbar Filters */}
                                    {/* Reuse Discovery Header for Search/Location/Date */}
                                    <div className="mb-6">
                                        <DiscoveryHeader
                                            searchTerm={filters.searchTerm}
                                            onSearchChange={(val) => updateFilter('searchTerm', val)}
                                            location={filters.locations[0] || ''}
                                            onLocationChange={(val) => updateFilter('locations', val ? [val] : [])}
                                            dateRange={filters.dateRange}
                                            onDateRangeChange={(range) => {
                                                updateFilter('dateRange', range);
                                                updateFilter('page', 1);
                                            }}
                                            onSearch={handleSearchWithHistory}
                                            onResetFilters={() => resetFilters()}
                                            activeFilterCount={activeFilterCount}
                                            // onFilterClick={() => setIsSidebarOpen(true)} // No sidebar here
                                            // onNearMeClick={onNearMeClick} // Unified hook doesn't expose logic directly but we can fix later if needed
                                            isDetectingLocation={isDetectingLocation}
                                            isSearching={isBackgroundRefetch}
                                            suggestions={suggestions}
                                            searchHistory={searchHistory}
                                            isAutocompletLoading={isSuggestionsLoading}
                                        />
                                    </div>

                                    <section className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-foreground-secondary">
                                                    Showing {rangeStart}-{rangeEnd} of {totalCount} events
                                                </p>
                                                {error && (
                                                    <p className="text-xs text-destructive mt-1">
                                                        Failed to refresh events.{' '}
                                                        <button className="underline" onClick={() => refetch()}>Try again</button>
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-foreground-secondary">
                                                <span>Sorted by</span>
                                                <Badge variant="outline" className="border-border-color/60 bg-background-secondary/60 text-foreground-secondary">
                                                    {sortLabel}
                                                </Badge>
                                            </div>
                                        </div>

                                        <AdminToolbarProvider>
                                            <AdminDataTable<EventRow>
                                                columns={columns}
                                                rows={rows}
                                                getRowId={(row) => row.id}
                                                sortKey={tableSortKey}
                                                sortDirection={filters.sortDirection}
                                                onSortChange={handleSortChange}
                                                isLoading={isLoading}
                                                onRowClick={(row) => handleOpenDetails(row.event)}
                                                className="w-full"
                                                hideInnerBorders={true}
                                                containerClassName="rounded-none shadow-none border-none bg-transparent"
                                                footerClassName="bg-transparent text-zinc-500 mt-0 px-0 py-4"
                                                tableClassName="text-zinc-900 dark:text-zinc-100"
                                                headerClassName="bg-transparent text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500 pl-4"
                                                headerRowClassName="h-9 hover:bg-transparent"
                                                bodyRowClassName="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors h-[52px] cursor-pointer group"
                                                pageSize={pagination.pageSize}
                                                pageSizeOptions={pageSizeOptions}
                                                onPageSizeChange={handlePageSizeChange}
                                                page={pagination.page}
                                                onPageChange={handlePageChange}
                                                total={totalCount}
                                                emptyState={
                                                    isUnauthorized ? (
                                                        <div className="py-24 text-center flex flex-col items-center justify-center">
                                                            <div className="w-12 h-12 bg-zinc-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4 text-zinc-400 dark:text-zinc-500">
                                                                <LockKey size={24} weight="duotone" />
                                                            </div>
                                                            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">Sign in to view events</h3>
                                                            <p className="text-sm text-zinc-500 mb-6 max-w-sm mx-auto">
                                                                Join our community to discover, track, and organize upcoming tech events.
                                                            </p>
                                                            <Link href="/login" onClick={() => posthog?.capture('events_wall_cta_clicked', { destination: '/login' })}>
                                                                <Button className="px-8 font-medium">
                                                                    Sign In
                                                                </Button>
                                                            </Link>
                                                        </div>
                                                    ) : (
                                                        <div className="py-20 text-center">
                                                            <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">No events found</h3>
                                                            <p className="text-xs text-zinc-500 mb-4">
                                                                Try adjusting your filters.
                                                            </p>
                                                            <button onClick={() => resetFilters()} className="text-xs font-medium text-accent-primary hover:underline">
                                                                Clear filters
                                                            </button>
                                                        </div>
                                                    )}
                                            />
                                        </AdminToolbarProvider>

                                    </section>
                                </div>
                            )}
                        </div>
                    </div>
                </main>

                {selectedEvent && (
                    isMobile ? (
                        <MobileEventDetailPanelDynamic
                            event={selectedEvent}
                            onClose={handleCloseDetails}
                            categories={initialCategories}
                        />
                    ) : (
                        <EventDetailSidebar
                            event={selectedEvent}
                            onClose={handleCloseDetails}
                            categories={initialCategories}
                        />
                    )
                )}
            </div>
        </SidebarProvider>
    );
}
